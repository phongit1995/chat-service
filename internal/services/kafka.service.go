package services

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
	"context"
	"encoding/json"
	"fmt"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type KafkaProducer struct {
	writer *kafka.Writer
	logger *zap.SugaredLogger
	cfg    *config.Config
}

func NewKafkaProducer(cfg *config.Config, logger *zap.SugaredLogger) (*KafkaProducer, error) {
	writer := &kafka.Writer{
		Addr:                   kafka.TCP(cfg.KafkaBrokers...),
		Balancer:               &kafka.LeastBytes{},
		AllowAutoTopicCreation: true,
		Compression:            kafka.Lz4,
	}

	logger.Infow("✅ Kafka Producer initialized", "brokers", cfg.KafkaBrokers)

	return &KafkaProducer{
		writer: writer,
		logger: logger.Named("[kafka_producer]"),
		cfg:    cfg,
	}, nil
}

func (p *KafkaProducer) PublishMessageCreated(ctx context.Context, payload interface{}) error {
	return p.publish(ctx, constants.KafkaTopicMessageCreated, payload)
}

func (p *KafkaProducer) PublishMessageDeleted(ctx context.Context, payload interface{}) error {
	return p.publish(ctx, constants.KafkaTopicMessageDeleted, payload)
}

func (p *KafkaProducer) PublishConversationUpdated(ctx context.Context, payload interface{}) error {
	return p.publish(ctx, constants.KafkaTopicConversationUpdated, payload)
}

func (p *KafkaProducer) publish(ctx context.Context, topic string, payload interface{}) error {
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

func (p *KafkaProducer) Close() error {
	if p.writer != nil {
		return p.writer.Close()
	}
	return nil
}
