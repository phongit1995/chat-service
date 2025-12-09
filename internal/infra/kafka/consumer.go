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
			Brokers:        c.cfg.KafkaBrokers,
			GroupID:        constants.KafkaConsumerGroup,
			Topic:          topic,
			MinBytes:       1,                      // Read immediately when ANY data available
			MaxBytes:       10e6,                   // Max 10MB per fetch
			MaxWait:        100 * time.Millisecond, // Max wait time before returning
			CommitInterval: time.Second,            // Commit offset every second
			StartOffset:    kafka.LastOffset,       // Start from latest for new consumers
		})

		c.readers = append(c.readers, reader)

		go c.consumeTopic(reader, handler, topic)
	}

	c.logger.Infow("✅ Kafka Consumer started", "topics", topics, "consumer_group", constants.KafkaConsumerGroup)
	return nil
}

func (c *Consumer) consumeTopic(reader *kafka.Reader, handler MessageHandler, topic string) {
	c.logger.Infow("Started consuming topic", "topic", topic, "workers", c.workers)

	messageChan := make(chan kafka.Message, c.workers*2)

	// Start worker pool
	for i := 0; i < c.workers; i++ {
		go c.worker(messageChan, handler, topic, i)
	}

	// Main loop: read messages and send to workers
	for {
		select {
		case <-c.ctx.Done():
			c.logger.Infow("Stopped consuming topic", "topic", topic)
			close(messageChan)
			return
		default:
			msg, err := reader.ReadMessage(c.ctx)
			if err != nil {
				if err == context.Canceled {
					close(messageChan)
					return
				}
				c.logger.Errorw("Error reading message", "topic", topic, "error", err)
				continue
			}

			c.logger.Debugw("Message received", "topic", msg.Topic, "partition", msg.Partition, "offset", msg.Offset)

			select {
			case messageChan <- msg:
			case <-c.ctx.Done():
				close(messageChan)
				return
			}
		}
	}
}

func (c *Consumer) worker(messageChan <-chan kafka.Message, handler MessageHandler, topic string, workerID int) {
	c.logger.Debugw("Worker started", "topic", topic, "worker_id", workerID, "message_timeout", c.messageTimeout)

	for msg := range messageChan {
		// Create context with timeout for this message
		msgCtx, cancel := context.WithTimeout(c.ctx, c.messageTimeout)

		// Channel to receive handler result
		errChan := make(chan error, 1)

		// Execute handler in goroutine to allow timeout
		go func() {
			errChan <- handler(msgCtx, msg.Value)
		}()

		// Wait for handler completion or timeout
		select {
		case err := <-errChan:
			cancel()
			if err != nil {
				c.logger.Errorw("Error handling message",
					"topic", topic,
					"worker_id", workerID,
					"partition", msg.Partition,
					"offset", msg.Offset,
					"error", err,
				)
			} else {
				c.logger.Debugw("Message processed successfully",
					"topic", topic,
					"worker_id", workerID,
					"partition", msg.Partition,
					"offset", msg.Offset,
				)
			}
		case <-msgCtx.Done():
			cancel()
			if msgCtx.Err() == context.DeadlineExceeded {
				c.logger.Errorw("Message processing timeout",
					"topic", topic,
					"worker_id", workerID,
					"partition", msg.Partition,
					"offset", msg.Offset,
					"timeout", c.messageTimeout,
				)
			} else {
				c.logger.Warnw("Message processing cancelled",
					"topic", topic,
					"worker_id", workerID,
					"partition", msg.Partition,
					"offset", msg.Offset,
					"error", msgCtx.Err(),
				)
			}
		}
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
