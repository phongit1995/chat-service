package kafka

import (
	"chat-server/internal/config"
	"context"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type MessageHandler func(ctx context.Context, message []byte) error

type Consumer struct {
	readers       []*kafka.Reader
	logger        *zap.SugaredLogger
	cfg           *config.Config
	handlers      map[string]MessageHandler
	ctx           context.Context
	cancel        context.CancelFunc
	consumerGroup string
}

func NewConsumer(cfg *config.Config, logger *zap.SugaredLogger, consumerGroup string) *Consumer {
	ctx, cancel := context.WithCancel(context.Background())

	return &Consumer{
		readers:       make([]*kafka.Reader, 0),
		logger:        logger.Named("[kafka_consumer]"),
		cfg:           cfg,
		handlers:      make(map[string]MessageHandler),
		ctx:           ctx,
		cancel:        cancel,
		consumerGroup: consumerGroup,
	}
}

func (c *Consumer) RegisterHandler(topic string, handler MessageHandler) {
	c.handlers[topic] = handler
	c.logger.Infow("Handler registered", "topic", topic)
}

func (c *Consumer) Start() error {
	var topics []string
	for topic := range c.handlers {
		topics = append(topics, topic)
	}

	for topic, handler := range c.handlers {
		reader := kafka.NewReader(kafka.ReaderConfig{
			Brokers:  c.cfg.KafkaBrokers,
			GroupID:  c.consumerGroup,
			Topic:    topic,
			MinBytes: 10e3,
			MaxBytes: 10e6,
		})

		c.readers = append(c.readers, reader)

		go c.consumeTopic(reader, handler, topic)
	}

	c.logger.Infow("✅ Kafka Consumer started", "topics", topics, "consumer_group", c.consumerGroup)
	return nil
}

func (c *Consumer) consumeTopic(reader *kafka.Reader, handler MessageHandler, topic string) {
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

func (c *Consumer) Close() error {
	c.cancel()

	for _, reader := range c.readers {
		if err := reader.Close(); err != nil {
			c.logger.Warnw("Error closing reader", "error", err)
		}
	}

	c.logger.Info("Kafka Consumer closed")
	return nil
}
