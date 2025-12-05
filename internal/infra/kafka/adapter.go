package kafka

import (
	conversationEvents "chat-server/internal/domain/conversation"
	messageEvents "chat-server/internal/domain/message"
	userEvents "chat-server/internal/domain/user"
	"context"
	"encoding/json"

	"go.uber.org/zap"
)

type KafkaEventAdapter struct {
	messageHandler      *messageEvents.EventHandler
	conversationHandler *conversationEvents.EventHandler
	userHandler         *userEvents.EventHandler
	logger              *zap.SugaredLogger
}

func NewKafkaEventAdapter(
	messageHandler *messageEvents.EventHandler,
	conversationHandler *conversationEvents.EventHandler,
	userHandler *userEvents.EventHandler,
	logger *zap.SugaredLogger,
) *KafkaEventAdapter {
	return &KafkaEventAdapter{
		messageHandler:      messageHandler,
		conversationHandler: conversationHandler,
		userHandler:         userHandler,
		logger:              logger.Named("[kafka_adapter]"),
	}
}

func (a *KafkaEventAdapter) HandleMessageCreated(ctx context.Context, message []byte) error {
	var event messageEvents.CreatedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		a.logger.Errorw("Failed to unmarshal MessageCreated", "error", err)
		return err
	}

	return a.messageHandler.OnCreated(ctx, &event)
}

func (a *KafkaEventAdapter) HandleMessageDeleted(ctx context.Context, message []byte) error {
	var event messageEvents.DeletedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		a.logger.Errorw("Failed to unmarshal MessageDeleted", "error", err)
		return err
	}

	return a.messageHandler.OnDeleted(ctx, &event)
}

func (a *KafkaEventAdapter) HandleMessageUpdated(ctx context.Context, message []byte) error {
	var event messageEvents.UpdatedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		a.logger.Errorw("Failed to unmarshal MessageUpdated", "error", err)
		return err
	}

	return a.messageHandler.OnUpdated(ctx, &event)
}

func (a *KafkaEventAdapter) HandleConversationCreated(ctx context.Context, message []byte) error {
	var event conversationEvents.CreatedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		a.logger.Errorw("Failed to unmarshal ConversationCreated", "error", err)
		return err
	}

	return a.conversationHandler.OnCreated(ctx, &event)
}

func (a *KafkaEventAdapter) HandleConversationUpdated(ctx context.Context, message []byte) error {
	var event conversationEvents.UpdatedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		a.logger.Errorw("Failed to unmarshal ConversationUpdated", "error", err)
		return err
	}

	return a.conversationHandler.OnUpdated(ctx, &event)
}

func (a *KafkaEventAdapter) HandleConversationDeleted(ctx context.Context, message []byte) error {
	var event conversationEvents.DeletedEvent

	if err := json.Unmarshal(message, &event); err != nil {
		a.logger.Errorw("Failed to unmarshal ConversationDeleted", "error", err)
		return err
	}

	return a.conversationHandler.OnDeleted(ctx, &event)
}

func (a *KafkaEventAdapter) HandleUserOnline(ctx context.Context, message []byte) error {
	var event userEvents.OnlineEvent

	if err := json.Unmarshal(message, &event); err != nil {
		a.logger.Errorw("Failed to unmarshal UserOnline", "error", err)
		return err
	}

	return a.userHandler.OnOnline(ctx, &event)
}

func (a *KafkaEventAdapter) HandleUserOffline(ctx context.Context, message []byte) error {
	var event userEvents.OfflineEvent

	if err := json.Unmarshal(message, &event); err != nil {
		a.logger.Errorw("Failed to unmarshal UserOffline", "error", err)
		return err
	}

	return a.userHandler.OnOffline(ctx, &event)
}

func (a *KafkaEventAdapter) HandleUserTyping(ctx context.Context, message []byte) error {
	var event userEvents.TypingEvent

	if err := json.Unmarshal(message, &event); err != nil {
		a.logger.Errorw("Failed to unmarshal UserTyping", "error", err)
		return err
	}

	return a.userHandler.OnTyping(ctx, &event)
}

func RegisterEventHandlers(consumer *Consumer, adapter *KafkaEventAdapter) {
	consumer.RegisterHandler("CHAT.MESSAGE.CREATED", adapter.HandleMessageCreated)
	consumer.RegisterHandler("CHAT.MESSAGE.DELETED", adapter.HandleMessageDeleted)
	consumer.RegisterHandler("CHAT.MESSAGE.UPDATED", adapter.HandleMessageUpdated)
	consumer.RegisterHandler("CHAT.CONVERSATION.CREATED", adapter.HandleConversationCreated)
	consumer.RegisterHandler("CHAT.CONVERSATION.UPDATED", adapter.HandleConversationUpdated)
	consumer.RegisterHandler("CHAT.CONVERSATION.DELETED", adapter.HandleConversationDeleted)
	consumer.RegisterHandler("CHAT.USER.ONLINE", adapter.HandleUserOnline)
	consumer.RegisterHandler("CHAT.USER.OFFLINE", adapter.HandleUserOffline)
	consumer.RegisterHandler("CHAT.USER.TYPING", adapter.HandleUserTyping)
}
