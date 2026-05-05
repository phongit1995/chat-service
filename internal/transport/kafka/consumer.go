package kafka

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
	"context"
	"time"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type MessageHandler func(ctx context.Context, message []byte) error

type Consumer struct {
	readers        []*kafka.Reader
	logger         *zap.SugaredLogger
	cfg            *config.Config
	handlers       map[string]MessageHandler
	ctx            context.Context
	cancel         context.CancelFunc
	workers        int
	messageTimeout time.Duration
}

func NewConsumer(cfg *config.Config, logger *zap.SugaredLogger) *Consumer {
	ctx, cancel := context.WithCancel(context.Background())

	workers := cfg.KafkaConsumerWorkers
	if workers <= 0 {
		workers = 10
	}

	timeoutSec := cfg.KafkaMessageTimeoutSec
	if timeoutSec <= 0 {
		timeoutSec = 10
	}

	return &Consumer{
		readers:        make([]*kafka.Reader, 0),
		logger:         logger.Named("[kafka_consumer]"),
		cfg:            cfg,
		handlers:       make(map[string]MessageHandler),
		ctx:            ctx,
		cancel:         cancel,
		workers:        workers,
		messageTimeout: time.Duration(timeoutSec) * time.Second,
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
			Brokers:     c.cfg.KafkaBrokers,
			GroupID:     constants.KafkaConsumerGroup,
			Topic:       topic,
			MinBytes:    1,
			MaxBytes:    10e6,
			MaxWait:     100 * time.Millisecond,
			StartOffset: kafka.LastOffset,
		})

		c.readers = append(c.readers, reader)

		go c.consumeTopic(reader, handler, topic)
	}

	c.logger.Infow("Kafka Consumer started", "topics", topics, "consumer_group", constants.KafkaConsumerGroup)
	return nil
}

func (c *Consumer) consumeTopic(reader *kafka.Reader, handler MessageHandler, topic string) {
	c.logger.Infow("Started consuming topic", "topic", topic, "workers", c.workers)

	messageChan := make(chan kafka.Message, c.workers*2)

	for i := 0; i < c.workers; i++ {
		go c.worker(reader, messageChan, handler, topic, i)
	}

	for {
		select {
		case <-c.ctx.Done():
			c.logger.Infow("Stopped consuming topic", "topic", topic)
			close(messageChan)
			return
		default:
			msg, err := reader.FetchMessage(c.ctx)
			if err != nil {
				if err == context.Canceled {
					close(messageChan)
					return
				}
				c.logger.Errorw("Error fetching message", "topic", topic, "error", err)
				continue
			}

			c.logger.Debugw("Message fetched", "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset)

			select {
			case messageChan <- msg:
			case <-c.ctx.Done():
				close(messageChan)
				return
			}
		}
	}
}

func (c *Consumer) worker(reader *kafka.Reader, messageChan <-chan kafka.Message, handler MessageHandler, topic string, workerID int) {
	c.logger.Debugw("Worker started", "topic", topic, "worker_id", workerID)

	for msg := range messageChan {
		msgCtx, cancel := context.WithTimeout(c.ctx, c.messageTimeout)

		err := handler(msgCtx, msg.Value)
		cancel()

		if err != nil {
			c.logger.Errorw("Error handling message",
				"topic", topic,
				"worker_id", workerID,
				"partition", msg.Partition,
				"offset", msg.Offset,
				"error", err,
			)
			continue
		}

		if commitErr := reader.CommitMessages(c.ctx, msg); commitErr != nil {
			c.logger.Errorw("Failed to commit offset",
				"topic", topic,
				"worker_id", workerID,
				"partition", msg.Partition,
				"offset", msg.Offset,
				"error", commitErr,
			)
			continue
		}

		c.logger.Debugw("Message processed and committed",
			"topic", topic,
			"worker_id", workerID,
			"partition", msg.Partition,
			"offset", msg.Offset,
		)
	}

	c.logger.Debugw("Worker stopped", "topic", topic, "worker_id", workerID)
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
