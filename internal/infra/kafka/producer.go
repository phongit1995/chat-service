package kafka

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
	conversationEvents "chat-server/internal/events/conversation"
	messageEvents "chat-server/internal/events/message"
	userEvents "chat-server/internal/events/user"
	"context"
	"encoding/json"
	"fmt"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type Producer struct {
	writer *kafka.Writer
	logger *zap.SugaredLogger
}

func NewProducer(cfg *config.Config, logger *zap.SugaredLogger) (*Producer, error) {
	writer := &kafka.Writer{
		Addr:                   kafka.TCP(cfg.KafkaBrokers...),
		Balancer:               &kafka.LeastBytes{},
		AllowAutoTopicCreation: true,
		Compression:            kafka.Lz4,
	}

	logger.Infow("✅ Kafka Producer initialized", "brokers", cfg.KafkaBrokers)

	return &Producer{
		writer: writer,
		logger: logger.Named("[kafka_producer]"),
	}, nil
}

func (p *Producer) PublishMessageCreated(ctx context.Context, event *messageEvents.CreatedEvent) error {
	return p.publish(ctx, constants.KafkaTopicMessageCreated, event)
}

func (p *Producer) PublishMessageDeleted(ctx context.Context, event *messageEvents.DeletedEvent) error {
	return p.publish(ctx, constants.KafkaTopicMessageDeleted, event)
}

func (p *Producer) PublishMessageUpdated(ctx context.Context, event *messageEvents.UpdatedEvent) error {
	return p.publish(ctx, constants.KafkaTopicMessageUpdated, event)
}

func (p *Producer) PublishConversationCreated(ctx context.Context, event *conversationEvents.CreatedEvent) error {
	return p.publish(ctx, constants.KafkaTopicConversationCreated, event)
}

func (p *Producer) PublishConversationUpdated(ctx context.Context, event *conversationEvents.UpdatedEvent) error {
	return p.publish(ctx, constants.KafkaTopicConversationUpdated, event)
}

func (p *Producer) PublishConversationDeleted(ctx context.Context, event *conversationEvents.DeletedEvent) error {
	return p.publish(ctx, constants.KafkaTopicConversationDeleted, event)
}

func (p *Producer) PublishUserOnline(ctx context.Context, event *userEvents.OnlineEvent) error {
	return p.publish(ctx, constants.KafkaTopicUserOnline, event)
}

func (p *Producer) PublishUserOffline(ctx context.Context, event *userEvents.OfflineEvent) error {
	return p.publish(ctx, constants.KafkaTopicUserOffline, event)
}

func (p *Producer) PublishUserTyping(ctx context.Context, event *userEvents.TypingEvent) error {
	return p.publish(ctx, constants.KafkaTopicUserTyping, event)
}

func (p *Producer) publish(ctx context.Context, topic string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	msg := kafka.Message{
		Topic: topic,
		Value: data,
	}

	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		p.logger.Errorw("Failed to publish message", "topic", topic, "error", err)
		return fmt.Errorf("failed to publish to topic %s: %w", topic, err)
	}

	p.logger.Debugw("Message published", "topic", topic, "size", len(data))
	return nil
}

func (p *Producer) Close() error {
	if p.writer != nil {
		return p.writer.Close()
	}
	return nil
}
