package message

import (
	"chat-server/internal/constants"
	conversationDomain "chat-server/internal/domain/conversation"
	"chat-server/internal/infra/websocket"
	"context"
	"encoding/json"
	"errors"
	"time"

	"go.uber.org/zap"
)

type EventHandler struct {
	wsServer  *websocket.Server
	convCache *conversationDomain.ConversationCacheAdapter
	logger    *zap.SugaredLogger
}

func NewEventHandler(
	wsServer *websocket.Server,
	convCache *conversationDomain.ConversationCacheAdapter,
	logger *zap.SugaredLogger,
) *EventHandler {
	return &EventHandler{
		wsServer:  wsServer,
		convCache: convCache,
		logger:    logger.Named("[message_events]"),
	}
}

func (h *EventHandler) OnCreated(ctx context.Context, message []byte) error {
	h.logger.Debugw("📥 Received MESSAGE_CREATED from Kafka",
		"raw_size", len(message),
	)

	var event MessageCreatedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		h.logger.Errorw("Failed to unmarshal MessageCreated", "error", err, "raw_message", string(message))
		return err
	}

	if err := h.validateCreatedEvent(&event); err != nil {
		h.logger.Errorw("Invalid MessageCreated event", "error", err)
		return err
	}

	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	if event.Message == nil {
		h.logger.Errorw("Message is required in MessageCreatedEvent")
		return errors.New("message is required")
	}

	conversationID := event.Message.ConversationID
	if conversationID == "" {
		h.logger.Errorw("ConversationID is required in message")
		return errors.New("conversation_id is required")
	}

	messageJSON, _ := json.Marshal(event.Message)
	h.logger.Infow("🔄 Processing MESSAGE_CREATED event",
		"conversation_id", conversationID,
		"message_id", event.Message.ID,
		"sender_id", event.Message.SenderID,
		"message", string(messageJSON),
	)

	h.logger.Debugw("📋 Getting conversation members from cache",
		"conversation_id", conversationID,
	)

	userIDs, err := h.convCache.GetConversationMembers(conversationID)
	if err != nil {
		h.logger.Errorw("Failed to get conversation members from cache",
			"conversation_id", conversationID,
			"error", err,
		)
		return err
	}

	h.logger.Infow("👥 Got conversation members",
		"conversation_id", conversationID,
		"member_count", len(userIDs),
		"user_ids", userIDs,
	)

	if len(userIDs) == 0 {
		h.logger.Warnw("No members found in conversation",
			"conversation_id", conversationID,
		)
		return nil
	}

	h.logger.Infow("📡 Emitting NEW_MESSAGE to WebSocket",
		"conversation_id", conversationID,
		"message_id", event.Message.ID,
		"recipient_count", len(userIDs),
		"recipients", userIDs,
		"message", string(messageJSON),
	)

	h.wsServer.EmitToUsers(userIDs, constants.WebSocketEventNewMessage, event.Message)

	h.logger.Infow("✅ MESSAGE_CREATED processed successfully",
		"conversation_id", conversationID,
		"message_id", event.Message.ID,
		"emitted_to", len(userIDs),
	)

	return nil
}

func (h *EventHandler) validateCreatedEvent(event *MessageCreatedEvent) error {
	if event.Message == nil {
		return errors.New("message is required")
	}
	if event.Message.ConversationID == "" {
		return errors.New("conversation_id is required in message")
	}
	if event.Message.ID == "" {
		return errors.New("message_id is required in message")
	}
	if event.Message.SenderID == "" {
		return errors.New("sender_id is required in message")
	}
	return nil
}

func (h *EventHandler) OnDeleted(ctx context.Context, message []byte) error {
	h.logger.Debugw("📥 Received MESSAGE_DELETED from Kafka",
		"raw_size", len(message),
	)

	var event MessageDeletedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		h.logger.Errorw("Failed to unmarshal MessageDeleted", "error", err, "raw_message", string(message))
		return err
	}

	if err := h.validateDeletedEvent(&event); err != nil {
		h.logger.Errorw("Invalid MessageDeleted event", "error", err)
		return err
	}

	h.logger.Infow("🔄 Processing MESSAGE_DELETED event",
		"conversation_id", event.ConversationID,
		"message_id", event.MessageID,
	)

	userIDs, err := h.convCache.GetConversationMembers(event.ConversationID)
	if err != nil {
		h.logger.Errorw("Failed to get conversation members from cache",
			"conversation_id", event.ConversationID,
			"error", err,
		)
		return err
	}

	h.logger.Infow("👥 Got conversation members",
		"conversation_id", event.ConversationID,
		"member_count", len(userIDs),
		"user_ids", userIDs,
	)

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

	h.logger.Infow("📡 Emitting MESSAGE_DELETED to WebSocket",
		"conversation_id", event.ConversationID,
		"message_id", event.MessageID,
		"recipient_count", len(userIDs),
		"recipients", userIDs,
	)

	h.wsServer.EmitToUsers(userIDs, constants.WebSocketEventMessageDeleted, data)

	h.logger.Infow("✅ MESSAGE_DELETED processed successfully",
		"conversation_id", event.ConversationID,
		"message_id", event.MessageID,
		"emitted_to", len(userIDs),
	)

	return nil
}

func (h *EventHandler) validateDeletedEvent(event *MessageDeletedEvent) error {
	if event.ConversationID == "" {
		return errors.New("conversation_id is required")
	}
	if event.MessageID == "" {
		return errors.New("message_id is required")
	}
	return nil
}

func (h *EventHandler) OnUpdated(ctx context.Context, message []byte) error {
	h.logger.Debugw("📥 Received MESSAGE_UPDATED from Kafka",
		"raw_size", len(message),
	)

	var event MessageUpdatedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		h.logger.Errorw("Failed to unmarshal MessageUpdated", "error", err, "raw_message", string(message))
		return err
	}

	if err := h.validateUpdatedEvent(&event); err != nil {
		h.logger.Errorw("Invalid MessageUpdated event", "error", err)
		return err
	}

	if event.Message == nil {
		h.logger.Errorw("Message is required in MessageUpdatedEvent")
		return errors.New("message is required")
	}

	conversationID := event.Message.ConversationID
	if conversationID == "" {
		h.logger.Errorw("ConversationID is required in message")
		return errors.New("conversation_id is required")
	}

	messageJSON, _ := json.Marshal(event.Message)
	h.logger.Infow("🔄 Processing MESSAGE_UPDATED event",
		"conversation_id", conversationID,
		"message_id", event.Message.ID,
		"message", string(messageJSON),
	)

	userIDs, err := h.convCache.GetConversationMembers(conversationID)
	if err != nil {
		h.logger.Errorw("Failed to get conversation members from cache",
			"conversation_id", conversationID,
			"error", err,
		)
		return err
	}

	h.logger.Infow("👥 Got conversation members",
		"conversation_id", conversationID,
		"member_count", len(userIDs),
		"user_ids", userIDs,
	)

	if len(userIDs) == 0 {
		h.logger.Warnw("No members found in conversation",
			"conversation_id", conversationID,
		)
		return nil
	}

	h.logger.Infow("📡 Emitting MESSAGE_UPDATED to WebSocket",
		"conversation_id", conversationID,
		"message_id", event.Message.ID,
		"recipient_count", len(userIDs),
		"recipients", userIDs,
		"message", string(messageJSON),
	)

	h.wsServer.EmitToUsers(userIDs, constants.WebSocketEventMessageUpdated, event.Message)

	h.logger.Infow("✅ MESSAGE_UPDATED processed successfully",
		"conversation_id", conversationID,
		"message_id", event.Message.ID,
		"emitted_to", len(userIDs),
	)

	return nil
}

func (h *EventHandler) validateUpdatedEvent(event *MessageUpdatedEvent) error {
	if event.Message == nil {
		return errors.New("message is required")
	}
	if event.Message.ConversationID == "" {
		return errors.New("conversation_id is required in message")
	}
	if event.Message.ID == "" {
		return errors.New("message_id is required in message")
	}
	return nil
}
