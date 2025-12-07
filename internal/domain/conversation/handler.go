package conversation

import (
	"chat-server/internal/constants"
	"chat-server/internal/infra/websocket"
	"context"
	"errors"

	"go.uber.org/zap"
)

type ConversationCache interface {
	GetConversationMembers(conversationID string) ([]string, error)
}

type EventHandler struct {
	wsServer  *websocket.Server
	convCache ConversationCache
	logger    *zap.SugaredLogger
}

func NewEventHandler(
	wsServer *websocket.Server,
	convCache ConversationCache,
	logger *zap.SugaredLogger,
) *EventHandler {
	return &EventHandler{
		wsServer:  wsServer,
		convCache: convCache,
		logger:    logger.Named("[conversation_events]"),
	}
}

func (h *EventHandler) OnCreated(ctx context.Context, event *CreatedEvent) error {
	if err := h.validateCreatedEvent(event); err != nil {
		h.logger.Errorw("Invalid ConversationCreated event", "error", err)
		return err
	}

	return nil
}

func (h *EventHandler) OnUpdated(ctx context.Context, event *UpdatedEvent) error {
	if err := h.validateUpdatedEvent(event); err != nil {
		h.logger.Errorw("Invalid ConversationUpdated event", "error", err)
		return err
	}

	userIDs, err := h.convCache.GetConversationMembers(event.ConversationID)
	if err != nil {
		h.logger.Errorw("Failed to get conversation members from cache",
			"conversation_id", event.ConversationID,
			"error", err,
		)
		return err
	}

	if len(userIDs) == 0 {
		h.logger.Warnw("No members found in conversation",
			"conversation_id", event.ConversationID,
		)
		return nil
	}

	h.wsServer.EmitToUsers(userIDs, constants.WebSocketEventConversationUpdated, event.Data)

	return nil
}

func (h *EventHandler) OnDeleted(ctx context.Context, event *DeletedEvent) error {
	if err := h.validateDeletedEvent(event); err != nil {
		h.logger.Errorw("Invalid ConversationDeleted event", "error", err)
		return err
	}

	return nil
}

func (h *EventHandler) validateCreatedEvent(event *CreatedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	return nil
}

func (h *EventHandler) validateUpdatedEvent(event *UpdatedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	return nil
}

func (h *EventHandler) validateDeletedEvent(event *DeletedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	return nil
}
