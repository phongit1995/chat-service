package message

import (
	"chat-server/internal/constants"
	"chat-server/internal/infra/websocket"
	"context"
	"errors"
	"time"

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
		logger:    logger.Named("[message_events]"),
	}
}

func (h *EventHandler) OnCreated(ctx context.Context, event *CreatedEvent) error {
	if err := h.validateCreatedEvent(event); err != nil {
		h.logger.Errorw("Invalid MessageCreated event", "error", err)
		return err
	}

	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
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

	h.wsServer.EmitToUsers(userIDs, constants.WebSocketEventNewMessage, event.Data)

	return nil
}

func (h *EventHandler) validateCreatedEvent(event *CreatedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	if event.MessageID == "" {
		return errors.New("message_id is required")
	}
	if event.SenderID == "" {
		return errors.New("sender_id is required")
	}
	return nil
}

func (h *EventHandler) OnDeleted(ctx context.Context, event *DeletedEvent) error {
	if err := h.validateDeletedEvent(event); err != nil {
		h.logger.Errorw("Invalid MessageDeleted event", "error", err)
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

	data := map[string]any{
		"conversation_id": event.ConversationID,
		"message_id":      event.MessageID,
	}
	h.wsServer.EmitToUsers(userIDs, constants.WebSocketEventMessageDeleted, data)

	return nil
}

func (h *EventHandler) validateDeletedEvent(event *DeletedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	if event.MessageID == "" {
		return errors.New("message_id is required")
	}
	return nil
}

func (h *EventHandler) OnUpdated(ctx context.Context, event *UpdatedEvent) error {
	if err := h.validateUpdatedEvent(event); err != nil {
		h.logger.Errorw("Invalid MessageUpdated event", "error", err)
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

	h.wsServer.EmitToUsers(userIDs, constants.WebSocketEventMessageUpdated, event.Data)

	return nil
}

func (h *EventHandler) validateUpdatedEvent(event *UpdatedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	if event.MessageID == "" {
		return errors.New("message_id is required")
	}
	return nil
}
