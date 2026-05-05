package kafka

import (
	"chat-server/internal/constants"
	conversationEvents "chat-server/internal/domain/conversation"
	messageEvents "chat-server/internal/domain/message"
	userEvents "chat-server/internal/domain/user"
	"context"
)

type KafkaEventAdapter struct {
	messageHandler      *messageEvents.EventHandler
	conversationHandler *conversationEvents.EventHandler
	userHandler         *userEvents.EventHandler
}

func NewKafkaEventAdapter(
	messageHandler *messageEvents.EventHandler,
	conversationHandler *conversationEvents.EventHandler,
	userHandler *userEvents.EventHandler,
) *KafkaEventAdapter {
	return &KafkaEventAdapter{
		messageHandler:      messageHandler,
		conversationHandler: conversationHandler,
		userHandler:         userHandler,
	}
}

func (a *KafkaEventAdapter) HandleMessageCreated(ctx context.Context, message []byte) error {
	return a.messageHandler.OnCreated(ctx, message)
}

func (a *KafkaEventAdapter) HandleMessageDeleted(ctx context.Context, message []byte) error {
	return a.messageHandler.OnDeleted(ctx, message)
}

func (a *KafkaEventAdapter) HandleMessageUpdated(ctx context.Context, message []byte) error {
	return a.messageHandler.OnUpdated(ctx, message)
}

func (a *KafkaEventAdapter) HandleConversationCreated(ctx context.Context, message []byte) error {
	return a.conversationHandler.OnCreated(ctx, message)
}

func (a *KafkaEventAdapter) HandleConversationUpdated(ctx context.Context, message []byte) error {
	return a.conversationHandler.OnUpdated(ctx, message)
}

func (a *KafkaEventAdapter) HandleConversationDeleted(ctx context.Context, message []byte) error {
	return a.conversationHandler.OnDeleted(ctx, message)
}

func (a *KafkaEventAdapter) HandleUserOnline(ctx context.Context, message []byte) error {
	return a.userHandler.OnOnline(ctx, message)
}

func (a *KafkaEventAdapter) HandleUserOffline(ctx context.Context, message []byte) error {
	return a.userHandler.OnOffline(ctx, message)
}

func (a *KafkaEventAdapter) HandleUserTyping(ctx context.Context, message []byte) error {
	return a.conversationHandler.OnTyping(ctx, message)
}

func RegisterEventHandlers(consumer *Consumer, adapter *KafkaEventAdapter) {
	consumer.RegisterHandler(constants.KafkaTopicMessageCreated, adapter.HandleMessageCreated)
	consumer.RegisterHandler(constants.KafkaTopicMessageDeleted, adapter.HandleMessageDeleted)
	consumer.RegisterHandler(constants.KafkaTopicMessageUpdated, adapter.HandleMessageUpdated)
	consumer.RegisterHandler(constants.KafkaTopicConversationCreated, adapter.HandleConversationCreated)
	consumer.RegisterHandler(constants.KafkaTopicConversationUpdated, adapter.HandleConversationUpdated)
	consumer.RegisterHandler(constants.KafkaTopicConversationDeleted, adapter.HandleConversationDeleted)
	consumer.RegisterHandler(constants.KafkaTopicUserOnline, adapter.HandleUserOnline)
	consumer.RegisterHandler(constants.KafkaTopicUserOffline, adapter.HandleUserOffline)
	consumer.RegisterHandler(constants.KafkaTopicUserTyping, adapter.HandleUserTyping)
}
