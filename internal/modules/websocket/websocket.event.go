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
	client.On("disconnect", func(args ...any) {
		h.handleDisconnect(client, userID)
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
