package user

import (
	"chat-server/internal/infra/websocket"
	"context"
	"encoding/json"
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

func (h *EventHandler) OnOnline(ctx context.Context, message []byte) error {
	h.logger.Debugw("📥 Received USER_ONLINE from Kafka",
		"raw_size", len(message),
	)

	var event OnlineEvent

	if err := json.Unmarshal(message, &event); err != nil {
		h.logger.Errorw("Failed to unmarshal UserOnline", "error", err, "raw_message", string(message))
		return err
	}

	h.logger.Infow("🔄 Processing USER_ONLINE event",
		"user_id", event.UserID,
	)

	if err := h.validateOnlineEvent(&event); err != nil {
		h.logger.Errorw("Invalid UserOnline event", "error", err)
		return err
	}

	h.logger.Infow("✅ USER_ONLINE processed successfully",
		"user_id", event.UserID,
	)

	return nil
}

func (h *EventHandler) OnOffline(ctx context.Context, message []byte) error {
	h.logger.Debugw("📥 Received USER_OFFLINE from Kafka",
		"raw_size", len(message),
	)

	var event OfflineEvent

	if err := json.Unmarshal(message, &event); err != nil {
		h.logger.Errorw("Failed to unmarshal UserOffline", "error", err, "raw_message", string(message))
		return err
	}

	h.logger.Infow("🔄 Processing USER_OFFLINE event",
		"user_id", event.UserID,
	)

	if err := h.validateOfflineEvent(&event); err != nil {
		h.logger.Errorw("Invalid UserOffline event", "error", err)
		return err
	}

	h.logger.Infow("✅ USER_OFFLINE processed successfully",
		"user_id", event.UserID,
	)

	return nil
}

func (h *EventHandler) OnTyping(ctx context.Context, message []byte) error {
	h.logger.Debugw("📥 Received USER_TYPING from Kafka",
		"raw_size", len(message),
	)

	var event TypingEvent

	if err := json.Unmarshal(message, &event); err != nil {
		h.logger.Errorw("Failed to unmarshal UserTyping", "error", err, "raw_message", string(message))
		return err
	}

	h.logger.Infow("🔄 Processing USER_TYPING event",
		"user_id", event.UserID,
		"conversation_id", event.ConversationID,
		"is_typing", event.IsTyping,
	)

	if err := h.validateTypingEvent(&event); err != nil {
		h.logger.Errorw("Invalid UserTyping event", "error", err)
		return err
	}

	h.logger.Infow("✅ USER_TYPING processed successfully",
		"user_id", event.UserID,
		"conversation_id", event.ConversationID,
	)

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
