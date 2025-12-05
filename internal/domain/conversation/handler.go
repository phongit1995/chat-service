package conversation

import (
	"chat-server/internal/constants"
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
		logger:   logger.Named("[conversation_events]"),
	}
}

func (h *EventHandler) OnCreated(ctx context.Context, event *CreatedEvent) error {
	if err := h.validateCreatedEvent(event); err != nil {
		h.logger.Errorw("❌ Invalid ConversationCreated event", "error", err)
		return err
	}

	h.logger.Debugw("💬 CONVERSATION_CREATED",
		"conversation_id", event.ConversationID,
		"user_count", len(event.UserIDs),
	)

	return nil
}

func (h *EventHandler) OnUpdated(ctx context.Context, event *UpdatedEvent) error {
	if err := h.validateUpdatedEvent(event); err != nil {
		h.logger.Errorw("❌ Invalid ConversationUpdated event", "error", err)
		return err
	}

	h.logger.Debugw("🔄 CONVERSATION_UPDATED",
		"conversation_id", event.ConversationID,
		"user_count", len(event.UserIDs),
	)

	h.wsServer.EmitToUsers(event.UserIDs, constants.WebSocketEventConversationUpdated, event.Data)

	return nil
}

func (h *EventHandler) OnDeleted(ctx context.Context, event *DeletedEvent) error {
	if err := h.validateDeletedEvent(event); err != nil {
		h.logger.Errorw("❌ Invalid ConversationDeleted event", "error", err)
		return err
	}

	h.logger.Debugw("❌ CONVERSATION_DELETED",
		"conversation_id", event.ConversationID,
		"user_count", len(event.UserIDs),
	)

	return nil
}

func (h *EventHandler) validateCreatedEvent(event *CreatedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	if len(event.UserIDs) == 0 {
		return errors.New("user_ids is required")
	}
	return nil
}

func (h *EventHandler) validateUpdatedEvent(event *UpdatedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	if len(event.UserIDs) == 0 {
		return errors.New("user_ids is required")
	}
	return nil
}

func (h *EventHandler) validateDeletedEvent(event *DeletedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	if len(event.UserIDs) == 0 {
		return errors.New("user_ids is required")
	}
	return nil
}
