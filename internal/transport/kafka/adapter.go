package kafka

import (
	"chat-server/internal/constants"
	callEvents "chat-server/internal/domain/call"
	conversationEvents "chat-server/internal/domain/conversation"
	messageEvents "chat-server/internal/domain/message"
	"context"
)

type KafkaEventAdapter struct {
	messageHandler      *messageEvents.EventHandler
	conversationHandler *conversationEvents.EventHandler
	callHandler         *callEvents.EventHandler
}

func NewKafkaEventAdapter(
	messageHandler *messageEvents.EventHandler,
	conversationHandler *conversationEvents.EventHandler,
	callHandler *callEvents.EventHandler,
) *KafkaEventAdapter {
	return &KafkaEventAdapter{
		messageHandler:      messageHandler,
		conversationHandler: conversationHandler,
		callHandler:         callHandler,
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

func (a *KafkaEventAdapter) HandleMessageReactionUpdated(ctx context.Context, message []byte) error {
	return a.messageHandler.OnReactionUpdated(ctx, message)
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

func (a *KafkaEventAdapter) HandleUserTyping(ctx context.Context, message []byte) error {
	return a.conversationHandler.OnTyping(ctx, message)
}

func (a *KafkaEventAdapter) HandleCallInvited(ctx context.Context, message []byte) error {
	return a.callHandler.OnInvited(ctx, message)
}

func (a *KafkaEventAdapter) HandleCallAccepted(ctx context.Context, message []byte) error {
	return a.callHandler.OnAccepted(ctx, message)
}

func (a *KafkaEventAdapter) HandleCallDeclined(ctx context.Context, message []byte) error {
	return a.callHandler.OnDeclined(ctx, message)
}

func (a *KafkaEventAdapter) HandleCallEnded(ctx context.Context, message []byte) error {
	return a.callHandler.OnEnded(ctx, message)
}

func RegisterEventHandlers(consumer *Consumer, adapter *KafkaEventAdapter) {
	consumer.RegisterHandler(constants.KafkaTopicMessageCreated, adapter.HandleMessageCreated)
	consumer.RegisterHandler(constants.KafkaTopicMessageDeleted, adapter.HandleMessageDeleted)
	consumer.RegisterHandler(constants.KafkaTopicMessageUpdated, adapter.HandleMessageUpdated)
	consumer.RegisterHandler(constants.KafkaTopicMessageReactionUpdated, adapter.HandleMessageReactionUpdated)
	consumer.RegisterHandler(constants.KafkaTopicConversationCreated, adapter.HandleConversationCreated)
	consumer.RegisterHandler(constants.KafkaTopicConversationUpdated, adapter.HandleConversationUpdated)
	consumer.RegisterHandler(constants.KafkaTopicConversationDeleted, adapter.HandleConversationDeleted)
	consumer.RegisterHandler(constants.KafkaTopicUserTyping, adapter.HandleUserTyping)
	consumer.RegisterHandler(constants.KafkaTopicCallInvited, adapter.HandleCallInvited)
	consumer.RegisterHandler(constants.KafkaTopicCallAccepted, adapter.HandleCallAccepted)
	consumer.RegisterHandler(constants.KafkaTopicCallDeclined, adapter.HandleCallDeclined)
	consumer.RegisterHandler(constants.KafkaTopicCallEnded, adapter.HandleCallEnded)
}
