package user

import (
	"chat-server/internal/transport/websocket"
	"context"

	"go.uber.org/zap"
)

type EventHandler struct {
	wsServer *websocket.Server
	logger   *zap.SugaredLogger
}

func NewEventHandler(wsServer *websocket.Server, logger *zap.SugaredLogger) *EventHandler {
	return &EventHandler{
		wsServer: wsServer,
		logger:   logger.Named("[user_events]"),
	}
}

func (h *EventHandler) OnOnline(ctx context.Context, message []byte) error {
	return nil
}

func (h *EventHandler) OnOffline(ctx context.Context, message []byte) error {
	return nil
}

func (h *EventHandler) OnTyping(ctx context.Context, message []byte) error {
	return nil
}
