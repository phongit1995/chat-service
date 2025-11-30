package services

import (
	"chat-server/internal/config"
	"context"
	"encoding/json"
	"fmt"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type MessageHandler func(ctx context.Context, message []byte) error

type KafkaConsumer struct {
	readers  []*kafka.Reader
	logger   *zap.SugaredLogger
	cfg      *config.Config
	handlers map[string]MessageHandler
	ctx      context.Context
	cancel   context.CancelFunc
}

func NewKafkaConsumer(cfg *config.Config, logger *zap.SugaredLogger) *KafkaConsumer {
	ctx, cancel := context.WithCancel(context.Background())

	return &KafkaConsumer{
		readers:  make([]*kafka.Reader, 0),
		logger:   logger.Named("[kafka_consumer]"),
		cfg:      cfg,
		handlers: make(map[string]MessageHandler),
		ctx:      ctx,
		cancel:   cancel,
	}
}

func (c *KafkaConsumer) RegisterHandler(topic string, handler MessageHandler) {
	c.handlers[topic] = handler
	c.logger.Infow("Handler registered", "topic", topic)
}

func (c *KafkaConsumer) Start() error {
	topics := []string{
		c.cfg.KafkaTopicMessageCreated,
		c.cfg.KafkaTopicMessageDeleted,
		c.cfg.KafkaTopicConversationUpdated,
	}

	for _, topic := range topics {
		handler, exists := c.handlers[topic]
		if !exists {
			c.logger.Warnw("No handler registered for topic", "topic", topic)
			continue
		}

		reader := kafka.NewReader(kafka.ReaderConfig{
			Brokers:  c.cfg.KafkaBrokers,
			GroupID:  c.cfg.KafkaConsumerGroup,
			Topic:    topic,
			MinBytes: 10e3,
			MaxBytes: 10e6,
		})

		c.readers = append(c.readers, reader)

		go c.consumeTopic(reader, handler, topic)
	}

	c.logger.Infow("✅ Kafka Consumer started", "topics", topics)
	return nil
}

func (c *KafkaConsumer) consumeTopic(reader *kafka.Reader, handler MessageHandler, topic string) {
	c.logger.Infow("Started consuming topic", "topic", topic)

	for {
		select {
		case <-c.ctx.Done():
			c.logger.Infow("Stopped consuming topic", "topic", topic)
			return
		default:
			msg, err := reader.ReadMessage(c.ctx)
			if err != nil {
				if err == context.Canceled {
					return
				}
				c.logger.Errorw("Error reading message", "topic", topic, "error", err)
				continue
			}

			c.logger.Debugw("Message received", "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset)

			if err := handler(c.ctx, msg.Value); err != nil {
				c.logger.Errorw("Error handling message", "topic", topic, "error", err)
			}
		}
	}
}

func (c *KafkaConsumer) Close() error {
	c.cancel()

	for _, reader := range c.readers {
		if err := reader.Close(); err != nil {
			c.logger.Warnw("Error closing reader", "error", err)
		}
	}

	c.logger.Info("Kafka Consumer closed")
	return nil
}

type MessageCreatedPayload struct {
	ConversationID string      `json:"conversation_id"`
	MessageID      string      `json:"message_id"`
	SenderID       string      `json:"sender_id"`
	Data           interface{} `json:"data"`
}

type MessageDeletedPayload struct {
	ConversationID string `json:"conversation_id"`
	MessageID      string `json:"message_id"`
}

type ConversationUpdatedPayload struct {
	ConversationID string      `json:"conversation_id"`
	UserIDs        []string    `json:"user_ids"`
	Data           interface{} `json:"data"`
}

func UnmarshalMessageCreated(data []byte) (*MessageCreatedPayload, error) {
	var payload MessageCreatedPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, fmt.Errorf("failed to unmarshal MessageCreatedPayload: %w", err)
	}
	return &payload, nil
}

func UnmarshalMessageDeleted(data []byte) (*MessageDeletedPayload, error) {
	var payload MessageDeletedPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, fmt.Errorf("failed to unmarshal MessageDeletedPayload: %w", err)
	}
	return &payload, nil
}

func UnmarshalConversationUpdated(data []byte) (*ConversationUpdatedPayload, error) {
	var payload ConversationUpdatedPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, fmt.Errorf("failed to unmarshal ConversationUpdatedPayload: %w", err)
	}
	return &payload, nil
}
