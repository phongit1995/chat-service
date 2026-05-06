package kafka

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
	"context"
	"errors"
	"hash/fnv"
	"strings"
	"time"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

type MessageHandler func(ctx context.Context, message []byte) error

type Consumer struct {
	logger         *zap.SugaredLogger
	cfg            *config.Config
	producer       *Producer
	handlers       map[string]MessageHandler
	ctx            context.Context
	cancel         context.CancelFunc
	workers        int
	messageTimeout time.Duration
	maxRetries     int
}

func NewConsumer(cfg *config.Config, logger *zap.SugaredLogger, producer *Producer) *Consumer {
	ctx, cancel := context.WithCancel(context.Background())

	workers := cfg.KafkaConsumerWorkers
	if workers <= 0 {
		workers = 4
	}

	timeoutSec := cfg.KafkaMessageTimeoutSec
	if timeoutSec <= 0 {
		timeoutSec = 10
	}

	return &Consumer{
		logger:         logger.Named("[kafka_consumer]"),
		cfg:            cfg,
		producer:       producer,
		handlers:       make(map[string]MessageHandler),
		ctx:            ctx,
		cancel:         cancel,
		workers:        workers,
		messageTimeout: time.Duration(timeoutSec) * time.Second,
		maxRetries:     3,
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
		go c.runTopic(topic, handler)
	}

	c.logger.Infow("Kafka Consumer started", "topics", topics, "consumer_group", constants.KafkaConsumerGroup)
	return nil
}

func (c *Consumer) runTopic(topic string, handler MessageHandler) {
	backoff := time.Second
	const maxBackoff = 30 * time.Second

	for {
		select {
		case <-c.ctx.Done():
			return
		default:
		}

		reader := c.newReader(topic)
		err := c.consumeWithReader(reader, topic, handler)
		_ = reader.Close()

		if c.ctx.Err() != nil {
			return
		}

		if err != nil {
			c.logger.Warnw("Reader loop exited, recreating",
				"topic", topic,
				"error", err,
				"backoff", backoff.String(),
			)
		}

		select {
		case <-time.After(backoff):
		case <-c.ctx.Done():
			return
		}

		if backoff < maxBackoff {
			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
		}
	}
}

func (c *Consumer) newReader(topic string) *kafka.Reader {
	return kafka.NewReader(kafka.ReaderConfig{
		Brokers:        c.cfg.KafkaBrokers,
		GroupID:        constants.KafkaConsumerGroup,
		Topic:          topic,
		MinBytes:       1,
		MaxBytes:       10e6,
		MaxWait:        500 * time.Millisecond,
		StartOffset:    kafka.FirstOffset,
		CommitInterval: 0,
	})
}

func (c *Consumer) consumeWithReader(reader *kafka.Reader, topic string, handler MessageHandler) error {
	c.logger.Infow("Started consuming topic", "topic", topic, "workers", c.workers)

	workerChans := make([]chan kafka.Message, c.workers)
	doneChans := make([]chan struct{}, c.workers)
	for i := 0; i < c.workers; i++ {
		workerChans[i] = make(chan kafka.Message, 32)
		doneChans[i] = make(chan struct{})
		go c.worker(reader, workerChans[i], doneChans[i], handler, topic, i)
	}

	defer func() {
		for _, ch := range workerChans {
			close(ch)
		}
		for _, d := range doneChans {
			<-d
		}
	}()

	transientErrCount := 0
	const maxTransient = 5

	for {
		select {
		case <-c.ctx.Done():
			return nil
		default:
		}

		msg, err := reader.FetchMessage(c.ctx)
		if err != nil {
			if errors.Is(err, context.Canceled) {
				return nil
			}
			if isTransientClusterError(err) {
				transientErrCount++
				c.logger.Warnw("Transient cluster error, will recreate reader",
					"topic", topic,
					"error", err,
					"count", transientErrCount,
				)
				if transientErrCount >= maxTransient {
					return err
				}
				time.Sleep(500 * time.Millisecond)
				continue
			}
			c.logger.Errorw("Error fetching message", "topic", topic, "error", err)
			return err
		}
		transientErrCount = 0

		idx := routeIndex(msg, c.workers)
		select {
		case workerChans[idx] <- msg:
		case <-c.ctx.Done():
			return nil
		}
	}
}

func (c *Consumer) worker(reader *kafka.Reader, in <-chan kafka.Message, done chan<- struct{}, handler MessageHandler, topic string, workerID int) {
	defer close(done)
	c.logger.Debugw("Worker started", "topic", topic, "worker_id", workerID)

	for msg := range in {
		c.processMessage(reader, handler, msg, topic, workerID)
	}

	c.logger.Debugw("Worker stopped", "topic", topic, "worker_id", workerID)
}

func (c *Consumer) processMessage(reader *kafka.Reader, handler MessageHandler, msg kafka.Message, topic string, workerID int) {
	var lastErr error
	backoff := 100 * time.Millisecond

	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		msgCtx, cancel := context.WithTimeout(c.ctx, c.messageTimeout)
		err := handler(msgCtx, msg.Value)
		cancel()

		if err == nil {
			if commitErr := reader.CommitMessages(c.ctx, msg); commitErr != nil {
				c.logger.Errorw("Failed to commit offset",
					"topic", topic,
					"worker_id", workerID,
					"partition", msg.Partition,
					"offset", msg.Offset,
					"error", commitErr,
				)
			}
			return
		}

		lastErr = err
		if attempt < c.maxRetries {
			c.logger.Warnw("Handler failed, retrying",
				"topic", topic,
				"worker_id", workerID,
				"attempt", attempt+1,
				"error", err,
			)
			select {
			case <-time.After(backoff):
			case <-c.ctx.Done():
				return
			}
			backoff *= 2
		}
	}

	c.logger.Errorw("Handler failed after retries, sending to DLQ",
		"topic", topic,
		"worker_id", workerID,
		"partition", msg.Partition,
		"offset", msg.Offset,
		"error", lastErr,
	)

	dlqCtx, dlqCancel := context.WithTimeout(c.ctx, 5*time.Second)
	dlqErr := c.producer.PublishToDLQ(dlqCtx, topic, string(msg.Key), msg.Value, lastErr.Error())
	dlqCancel()

	if dlqErr != nil {
		c.logger.Errorw("Failed to publish to DLQ, leaving offset uncommitted",
			"topic", topic,
			"error", dlqErr,
		)
		return
	}

	if commitErr := reader.CommitMessages(c.ctx, msg); commitErr != nil {
		c.logger.Errorw("Failed to commit poisoned message offset after DLQ",
			"topic", topic,
			"error", commitErr,
		)
	}
}

func routeIndex(msg kafka.Message, workers int) int {
	if workers <= 1 {
		return 0
	}
	if len(msg.Key) > 0 {
		h := fnv.New32a()
		_, _ = h.Write(msg.Key)
		return int(h.Sum32() % uint32(workers))
	}
	if msg.Partition >= 0 {
		return msg.Partition % workers
	}
	return 0
}

func isTransientClusterError(err error) bool {
	if err == nil {
		return false
	}
	var kErr kafka.Error
	if errors.As(err, &kErr) {
		switch kErr {
		case kafka.NotCoordinatorForGroup,
			kafka.GroupCoordinatorNotAvailable,
			kafka.NotLeaderForPartition,
			kafka.LeaderNotAvailable,
			kafka.RebalanceInProgress,
			kafka.GroupLoadInProgress:
			return true
		}
	}
	msg := err.Error()
	return strings.Contains(msg, "Not Coordinator") ||
		strings.Contains(msg, "Coordinator Not Available") ||
		strings.Contains(msg, "Leader Not Available") ||
		strings.Contains(msg, "Rebalance In Progress")
}

func (c *Consumer) Close() error {
	c.cancel()
	c.logger.Info("Kafka Consumer closed")
	return nil
}
