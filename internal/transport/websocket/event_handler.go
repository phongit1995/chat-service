package websocket

import (
	socket "github.com/zishang520/socket.io/servers/socket/v3"
)

type ConversationMembersGetter interface {
	GetConversationMembers(conversationID string) ([]string, error)
}

type EventHandler struct {
	server          *Server
	presenceService *PresenceService
	convMembers     ConversationMembersGetter
}

func NewEventHandler(server *Server, presenceService *PresenceService, convMembers ConversationMembersGetter) *EventHandler {
	return &EventHandler{
		server:          server,
		presenceService: presenceService,
		convMembers:     convMembers,
	}
}

func (h *EventHandler) RegisterEvents() {
	h.server.io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		data := client.Data().(*SocketData)
		userID := data.UserID

		h.handleConnection(client, userID)
	})
}

func (h *EventHandler) handleConnection(client *socket.Socket, userID string) {
	client.Join(socket.Room("user:" + userID))

	isFirstConnection, err := h.presenceService.AddConnection(userID)
	if err != nil {
		h.server.logger.Errorw("Failed to add presence", "user_id", userID, "error", err)
	}

	h.server.logger.Infow("WebSocket connected",
		"user_id", userID,
		"socket_id", client.Id(),
		"is_first_connection", isFirstConnection)

	h.registerClientEvents(client, userID)
}

func (h *EventHandler) registerClientEvents(client *socket.Socket, userID string) {
	// Disconnect event
	client.On("disconnect", func(args ...any) {
		h.handleDisconnect(client, userID)
	})

	// Typing indicator event
	client.On("typing", func(args ...any) {
		h.handleTyping(client, userID, args)
	})

	// Stop typing event
	client.On("stop_typing", func(args ...any) {
		h.handleStopTyping(client, userID, args)
	})

	// Heartbeat ping to refresh presence TTL
	client.On("ping", func(args ...any) {
		if err := h.presenceService.RefreshPresence(userID); err != nil {
			h.server.logger.Warnw("Failed to refresh presence on ping", "user_id", userID, "error", err)
		}
	})
}

func (h *EventHandler) handleDisconnect(client *socket.Socket, userID string) {
	isLastConnection, err := h.presenceService.RemoveConnection(userID)
	if err != nil {
		h.server.logger.Errorw("Failed to remove presence", "user_id", userID, "error", err)
	}

	h.server.logger.Infow("WebSocket disconnected",
		"user_id", userID,
		"socket_id", client.Id(),
		"is_last_connection", isLastConnection)
}

// handleTyping handles typing indicator from client
func (h *EventHandler) handleTyping(client *socket.Socket, userID string, args []any) {
	if len(args) == 0 {
		h.server.logger.Warnw("Typing event without data", "user_id", userID)
		return
	}

	// Parse event data
	data, ok := args[0].(map[string]interface{})
	if !ok {
		h.server.logger.Warnw("Invalid typing event data", "user_id", userID)
		return
	}

	conversationID, ok := data["conversation_id"].(string)
	if !ok || conversationID == "" {
		h.server.logger.Warnw("Missing conversation_id in typing event", "user_id", userID)
		return
	}

	h.server.logger.Debugw("⌨️ User typing",
		"user_id", userID,
		"conversation_id", conversationID,
	)

	h.fanoutTypingToMembers(userID, conversationID, "USER_TYPING", true)
}

// handleStopTyping handles stop typing indicator from client
func (h *EventHandler) handleStopTyping(client *socket.Socket, userID string, args []any) {
	if len(args) == 0 {
		h.server.logger.Warnw("Stop typing event without data", "user_id", userID)
		return
	}

	// Parse event data
	data, ok := args[0].(map[string]interface{})
	if !ok {
		h.server.logger.Warnw("Invalid stop typing event data", "user_id", userID)
		return
	}

	conversationID, ok := data["conversation_id"].(string)
	if !ok || conversationID == "" {
		h.server.logger.Warnw("Missing conversation_id in stop typing event", "user_id", userID)
		return
	}

	h.server.logger.Debugw("⌨️ User stopped typing",
		"user_id", userID,
		"conversation_id", conversationID,
	)

	h.fanoutTypingToMembers(userID, conversationID, "USER_STOP_TYPING", false)
}

func (h *EventHandler) fanoutTypingToMembers(senderUserID, conversationID, event string, isTyping bool) {
	if h.convMembers == nil {
		h.server.logger.Warnw("convMembers not configured, skipping typing fanout")
		return
	}
	memberIDs, err := h.convMembers.GetConversationMembers(conversationID)
	if err != nil {
		h.server.logger.Warnw("Failed to get members for typing", "conversation_id", conversationID, "error", err)
		return
	}
	recipients := make([]string, 0, len(memberIDs))
	for _, uid := range memberIDs {
		if uid != senderUserID {
			recipients = append(recipients, uid)
		}
	}
	if len(recipients) == 0 {
		return
	}
	payload := map[string]any{
		"userId":         senderUserID,
		"conversationId": conversationID,
		"isTyping":       isTyping,
	}
	h.server.EmitToUsers(recipients, event, payload)
}
