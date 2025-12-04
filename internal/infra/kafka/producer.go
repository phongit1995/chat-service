package kafka

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
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

func (p *Producer) PublishMessageCreated(ctx context.Context, payload *MessageCreatedPayload) error {
	return p.publish(ctx, constants.KafkaTopicMessageCreated, payload)
}

func (p *Producer) PublishMessageDeleted(ctx context.Context, payload *MessageDeletedPayload) error {
	return p.publish(ctx, constants.KafkaTopicMessageDeleted, payload)
}

func (p *Producer) PublishMessageUpdated(ctx context.Context, payload *MessageUpdatedPayload) error {
	return p.publish(ctx, constants.KafkaTopicMessageUpdated, payload)
}

func (p *Producer) PublishConversationCreated(ctx context.Context, payload *ConversationCreatedPayload) error {
	return p.publish(ctx, constants.KafkaTopicConversationCreated, payload)
}

func (p *Producer) PublishConversationUpdated(ctx context.Context, payload *ConversationUpdatedPayload) error {
	return p.publish(ctx, constants.KafkaTopicConversationUpdated, payload)
}

func (p *Producer) PublishConversationDeleted(ctx context.Context, payload *ConversationDeletedPayload) error {
	return p.publish(ctx, constants.KafkaTopicConversationDeleted, payload)
}

func (p *Producer) PublishUserOnline(ctx context.Context, payload *UserOnlinePayload) error {
	return p.publish(ctx, constants.KafkaTopicUserOnline, payload)
}

func (p *Producer) PublishUserOffline(ctx context.Context, payload *UserOfflinePayload) error {
	return p.publish(ctx, constants.KafkaTopicUserOffline, payload)
}

func (p *Producer) PublishUserTyping(ctx context.Context, payload *UserTypingPayload) error {
	return p.publish(ctx, constants.KafkaTopicUserTyping, payload)
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
