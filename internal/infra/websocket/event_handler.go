package websocket

import (
	socket "github.com/zishang520/socket.io/servers/socket/v3"
)

type EventHandler struct {
	server          *Server
	presenceService *PresenceService
}

func NewEventHandler(server *Server, presenceService *PresenceService) *EventHandler {
	return &EventHandler{
		server:          server,
		presenceService: presenceService,
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

	if isFirstConnection {
		h.server.EmitUserOnlineStatus(userID, true)
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
}

func (h *EventHandler) handleDisconnect(client *socket.Socket, userID string) {
	isLastConnection, err := h.presenceService.RemoveConnection(userID)
	if err != nil {
		h.server.logger.Errorw("Failed to remove presence", "user_id", userID, "error", err)
	}

	if isLastConnection {
		h.server.EmitUserOnlineStatus(userID, false)
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

	// Emit to other users in conversation (exclude sender)
	// Get conversation members and emit
	payload := map[string]any{
		"user_id":         userID,
		"conversation_id": conversationID,
		"is_typing":       true,
	}

	// TODO: Get conversation members and emit only to them
	// For now, emit to all users in the conversation room
	h.server.io.To(socket.Room("conversation:"+conversationID)).Emit("USER_TYPING", payload)
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

	// Emit to other users in conversation
	payload := map[string]any{
		"user_id":         userID,
		"conversation_id": conversationID,
		"is_typing":       false,
	}

	h.server.io.To(socket.Room("conversation:"+conversationID)).Emit("USER_STOP_TYPING", payload)
}
