package websocket

import (
	"chat-server/internal/constants"
	"chat-server/internal/services"
	"context"

	"go.uber.org/zap"
)

type KafkaHandlers struct {
	wsServer *Server
	logger   *zap.SugaredLogger
}

func NewKafkaHandlers(wsServer *Server, logger *zap.SugaredLogger) *KafkaHandlers {
	return &KafkaHandlers{
		wsServer: wsServer,
		logger:   logger.Named("[kafka_handlers]"),
	}
}

func (h *KafkaHandlers) HandleMessageCreated(ctx context.Context, message []byte) error {
	payload, err := services.UnmarshalMessageCreated(message)
	if err != nil {
		h.logger.Errorw("Failed to unmarshal message created", "error", err)
		return err
	}

	h.logger.Debugw("Handling message created", "conversation_id", payload.ConversationID, "message_id", payload.MessageID)

	h.wsServer.EmitNewMessage(payload.ConversationID, payload.Data)

	return nil
}

func (h *KafkaHandlers) HandleMessageDeleted(ctx context.Context, message []byte) error {
	payload, err := services.UnmarshalMessageDeleted(message)
	if err != nil {
		h.logger.Errorw("Failed to unmarshal message deleted", "error", err)
		return err
	}

	h.logger.Debugw("Handling message deleted", "conversation_id", payload.ConversationID, "message_id", payload.MessageID)

	h.wsServer.EmitMessageDeleted(payload.ConversationID, payload.MessageID)

	return nil
}

func (h *KafkaHandlers) HandleConversationUpdated(ctx context.Context, message []byte) error {
	payload, err := services.UnmarshalConversationUpdated(message)
	if err != nil {
		h.logger.Errorw("Failed to unmarshal conversation updated", "error", err)
		return err
	}

	h.logger.Debugw("Handling conversation updated", "conversation_id", payload.ConversationID, "user_count", len(payload.UserIDs))

	h.wsServer.EmitConversationUpdated(payload.UserIDs, payload.Data)

	return nil
}

func RegisterKafkaHandlers(consumer *services.KafkaConsumer, handlers *KafkaHandlers) {
	consumer.RegisterHandler(constants.KafkaTopicMessageCreated, handlers.HandleMessageCreated)
	consumer.RegisterHandler(constants.KafkaTopicMessageDeleted, handlers.HandleMessageDeleted)
	consumer.RegisterHandler(constants.KafkaTopicConversationUpdated, handlers.HandleConversationUpdated)
}
