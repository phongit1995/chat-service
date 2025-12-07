package user

import (
	"chat-server/internal/infra/websocket"
	"context"
	"errors"

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

func (h *EventHandler) OnOnline(ctx context.Context, event *OnlineEvent) error {
	if err := h.validateOnlineEvent(event); err != nil {
		h.logger.Errorw("Invalid UserOnline event", "error", err)
		return err
	}

	return nil
}

func (h *EventHandler) OnOffline(ctx context.Context, event *OfflineEvent) error {
	if err := h.validateOfflineEvent(event); err != nil {
		h.logger.Errorw("Invalid UserOffline event", "error", err)
		return err
	}

	return nil
}

func (h *EventHandler) OnTyping(ctx context.Context, event *TypingEvent) error {
	if err := h.validateTypingEvent(event); err != nil {
		h.logger.Errorw("Invalid UserTyping event", "error", err)
		return err
	}

	return nil
}

func (h *EventHandler) validateOnlineEvent(event *OnlineEvent) error {
	if event.UserID == "" {
		return errors.New("user_id is required")
	}
	return nil
}

func (h *EventHandler) validateOfflineEvent(event *OfflineEvent) error {
	if event.UserID == "" {
		return errors.New("user_id is required")
	}
	return nil
}

func (h *EventHandler) validateTypingEvent(event *TypingEvent) error {
	if event.UserID == "" {
		return errors.New("user_id is required")
	}
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	return nil
}
