package kafka

import (
	"chat-server/internal/constants"
	"chat-server/internal/modules/websocket"
	"context"
	"encoding/json"

	"go.uber.org/zap"
)

type Handlers struct {
	wsServer *websocket.Server
	logger   *zap.SugaredLogger
}

func NewHandlers(wsServer *websocket.Server, logger *zap.SugaredLogger) *Handlers {
	return &Handlers{
		wsServer: wsServer,
		logger:   logger.Named("[kafka_handlers]"),
	}
}

func (h *Handlers) HandleMessageCreated(ctx context.Context, message []byte) error {
	var payload MessageCreatedPayload
	if err := json.Unmarshal(message, &payload); err != nil {
		h.logger.Errorw("Failed to unmarshal message created", "error", err)
		return err
	}

	h.logger.Debugw("📩 MESSAGE_CREATED",
		"conversation_id", payload.ConversationID,
		"message_id", payload.MessageID,
		"sender_id", payload.SenderID,
		"user_count", len(payload.UserIDs),
	)

	h.wsServer.EmitToUsers(payload.UserIDs, constants.WebSocketEventNewMessage, payload.Data)

	return nil
}

func (h *Handlers) HandleMessageDeleted(ctx context.Context, message []byte) error {
	var payload MessageDeletedPayload
	if err := json.Unmarshal(message, &payload); err != nil {
		h.logger.Errorw("Failed to unmarshal message deleted", "error", err)
		return err
	}

	h.logger.Debugw("🗑️ MESSAGE_DELETED",
		"conversation_id", payload.ConversationID,
		"message_id", payload.MessageID,
		"user_count", len(payload.UserIDs),
	)

	data := map[string]any{
		"conversation_id": payload.ConversationID,
		"message_id":      payload.MessageID,
	}
	h.wsServer.EmitToUsers(payload.UserIDs, constants.WebSocketEventMessageDeleted, data)

	return nil
}

func (h *Handlers) HandleMessageUpdated(ctx context.Context, message []byte) error {
	var payload MessageUpdatedPayload
	if err := json.Unmarshal(message, &payload); err != nil {
		h.logger.Errorw("Failed to unmarshal message updated", "error", err)
		return err
	}

	h.logger.Debugw("✏️ MESSAGE_UPDATED",
		"conversation_id", payload.ConversationID,
		"message_id", payload.MessageID,
	)

	// TODO: Implement EmitMessageUpdated in WebSocket Server
	// h.wsServer.EmitMessageUpdated(payload.ConversationID, payload.MessageID, payload.Data)

	return nil
}

func (h *Handlers) HandleConversationCreated(ctx context.Context, message []byte) error {
	var payload ConversationCreatedPayload
	if err := json.Unmarshal(message, &payload); err != nil {
		h.logger.Errorw("Failed to unmarshal conversation created", "error", err)
		return err
	}

	h.logger.Debugw("💬 CONVERSATION_CREATED",
		"conversation_id", payload.ConversationID,
		"user_count", len(payload.UserIDs),
	)

	// TODO: Implement EmitConversationCreated in WebSocket Server
	// h.wsServer.EmitConversationCreated(payload.UserIDs, payload.Data)

	return nil
}

func (h *Handlers) HandleConversationUpdated(ctx context.Context, message []byte) error {
	var payload ConversationUpdatedPayload
	if err := json.Unmarshal(message, &payload); err != nil {
		h.logger.Errorw("Failed to unmarshal conversation updated", "error", err)
		return err
	}

	h.logger.Debugw("🔄 CONVERSATION_UPDATED",
		"conversation_id", payload.ConversationID,
		"user_count", len(payload.UserIDs),
	)

	h.wsServer.EmitToUsers(payload.UserIDs, constants.WebSocketEventConversationUpdated, payload.Data)

	return nil
}

func (h *Handlers) HandleConversationDeleted(ctx context.Context, message []byte) error {
	var payload ConversationDeletedPayload
	if err := json.Unmarshal(message, &payload); err != nil {
		h.logger.Errorw("Failed to unmarshal conversation deleted", "error", err)
		return err
	}

	h.logger.Debugw("❌ CONVERSATION_DELETED",
		"conversation_id", payload.ConversationID,
		"user_count", len(payload.UserIDs),
	)

	// TODO: Implement EmitConversationDeleted in WebSocket Server
	// h.wsServer.EmitConversationDeleted(payload.UserIDs, payload.ConversationID)

	return nil
}

func (h *Handlers) HandleUserOnline(ctx context.Context, message []byte) error {
	var payload UserOnlinePayload
	if err := json.Unmarshal(message, &payload); err != nil {
		h.logger.Errorw("Failed to unmarshal user online", "error", err)
		return err
	}

	h.logger.Debugw("🟢 USER_ONLINE",
		"user_id", payload.UserID,
		"timestamp", payload.Timestamp,
	)

	// TODO: Implement EmitUserOnline in WebSocket Server
	// h.wsServer.EmitUserOnline(payload.UserID, payload.Timestamp)

	return nil
}

func (h *Handlers) HandleUserOffline(ctx context.Context, message []byte) error {
	var payload UserOfflinePayload
	if err := json.Unmarshal(message, &payload); err != nil {
		h.logger.Errorw("Failed to unmarshal user offline", "error", err)
		return err
	}

	h.logger.Debugw("⚫ USER_OFFLINE",
		"user_id", payload.UserID,
		"timestamp", payload.Timestamp,
	)

	// TODO: Implement EmitUserOffline in WebSocket Server
	// h.wsServer.EmitUserOffline(payload.UserID, payload.Timestamp)

	return nil
}

func (h *Handlers) HandleUserTyping(ctx context.Context, message []byte) error {
	var payload UserTypingPayload
	if err := json.Unmarshal(message, &payload); err != nil {
		h.logger.Errorw("Failed to unmarshal user typing", "error", err)
		return err
	}

	typingStatus := "typing"
	if !payload.IsTyping {
		typingStatus = "stopped typing"
	}

	h.logger.Debugw("⌨️ USER_TYPING",
		"user_id", payload.UserID,
		"conversation_id", payload.ConversationID,
		"status", typingStatus,
	)

	// TODO: Implement EmitUserTyping in WebSocket Server
	// h.wsServer.EmitUserTyping(payload.ConversationID, payload.UserID, payload.IsTyping)

	return nil
}

// RegisterHandlers registers all Kafka handlers with the consumer
func RegisterHandlers(consumer *Consumer, handlers *Handlers) {
	consumer.RegisterHandler(constants.KafkaTopicMessageCreated, handlers.HandleMessageCreated)
	consumer.RegisterHandler(constants.KafkaTopicMessageDeleted, handlers.HandleMessageDeleted)
	consumer.RegisterHandler(constants.KafkaTopicMessageUpdated, handlers.HandleMessageUpdated)
	consumer.RegisterHandler(constants.KafkaTopicConversationCreated, handlers.HandleConversationCreated)
	consumer.RegisterHandler(constants.KafkaTopicConversationUpdated, handlers.HandleConversationUpdated)
	consumer.RegisterHandler(constants.KafkaTopicConversationDeleted, handlers.HandleConversationDeleted)
	consumer.RegisterHandler(constants.KafkaTopicUserOnline, handlers.HandleUserOnline)
	consumer.RegisterHandler(constants.KafkaTopicUserOffline, handlers.HandleUserOffline)
	consumer.RegisterHandler(constants.KafkaTopicUserTyping, handlers.HandleUserTyping)
}
