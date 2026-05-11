package kafka

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
	conversationEvents "chat-server/internal/domain/conversation"
	messageEvents "chat-server/internal/domain/message"
	"context"
	"encoding/json"
	"fmt"
	"time"

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
		Balancer:               &kafka.Hash{},
		RequiredAcks:           kafka.RequireAll,
		Async:                  false,
		BatchTimeout:           10 * time.Millisecond,
		WriteTimeout:           5 * time.Second,
		ReadTimeout:            5 * time.Second,
		AllowAutoTopicCreation: true,
		Compression:            kafka.Lz4,
	}

	logger.Infow("✅ Kafka Producer initialized", "brokers", cfg.KafkaBrokers)

	return &Producer{
		writer: writer,
		logger: logger.Named("[kafka_producer]"),
	}, nil
}

func (p *Producer) PublishMessageCreated(ctx context.Context, event *messageEvents.MessageCreatedEvent) error {
	return p.publishKeyed(ctx, constants.KafkaTopicMessageCreated, conversationKey(event.Conversation), event)
}

func (p *Producer) PublishMessageDeleted(ctx context.Context, event *messageEvents.MessageDeletedEvent) error {
	return p.publishKeyed(ctx, constants.KafkaTopicMessageDeleted, conversationKey(event.Conversation), event)
}

func (p *Producer) PublishMessageUpdated(ctx context.Context, event *messageEvents.MessageUpdatedEvent) error {
	return p.publishKeyed(ctx, constants.KafkaTopicMessageUpdated, conversationKey(event.Conversation), event)
}

func (p *Producer) PublishConversationCreated(ctx context.Context, event *conversationEvents.CreatedEvent) error {
	return p.publishKeyed(ctx, constants.KafkaTopicConversationCreated, event.ConversationID, event)
}

func (p *Producer) PublishConversationUpdated(ctx context.Context, event *conversationEvents.UpdatedEvent) error {
	return p.publishKeyed(ctx, constants.KafkaTopicConversationUpdated, event.ConversationID, event)
}

func (p *Producer) PublishConversationDeleted(ctx context.Context, event *conversationEvents.DeletedEvent) error {
	return p.publishKeyed(ctx, constants.KafkaTopicConversationDeleted, event.ConversationID, event)
}

func (p *Producer) PublishConversationTyping(ctx context.Context, event *conversationEvents.TypingEvent) error {
	return p.publishKeyed(ctx, constants.KafkaTopicUserTyping, event.ConversationID, event)
}

func (p *Producer) PublishToDLQ(ctx context.Context, originalTopic string, key string, payload []byte, reason string) error {
	dlqTopic := originalTopic + ".DLQ"
	msg := kafka.Message{
		Topic: dlqTopic,
		Key:   []byte(key),
		Value: payload,
		Headers: []kafka.Header{
			{Key: "x-original-topic", Value: []byte(originalTopic)},
			{Key: "x-failure-reason", Value: []byte(reason)},
			{Key: "x-failed-at", Value: []byte(time.Now().UTC().Format(time.RFC3339Nano))},
		},
	}
	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		return fmt.Errorf("failed to publish to DLQ %s: %w", dlqTopic, err)
	}
	p.logger.Warnw("Message routed to DLQ", "dlq_topic", dlqTopic, "original_topic", originalTopic, "reason", reason)
	return nil
}

func (p *Producer) publishKeyed(ctx context.Context, topic string, key string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	msg := kafka.Message{
		Topic: topic,
		Value: data,
		Headers: []kafka.Header{
			{Key: "ts", Value: []byte(time.Now().UTC().Format(time.RFC3339Nano))},
		},
	}
	if key != "" {
		msg.Key = []byte(key)
	}

	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		p.logger.Errorw("Failed to publish message", "topic", topic, "key", key, "error", err)
		return fmt.Errorf("failed to publish to topic %s: %w", topic, err)
	}

	p.logger.Debugw("Message published", "topic", topic, "key", key, "size", len(data))
	return nil
}

func conversationKey(c *messageEvents.ConversationData) string {
	if c == nil {
		return ""
	}
	return c.ID
}

func (p *Producer) Close() error {
	if p.writer != nil {
		return p.writer.Close()
	}
	return nil
}
