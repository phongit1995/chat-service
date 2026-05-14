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

