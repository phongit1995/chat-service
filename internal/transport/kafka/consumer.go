package kafka

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
	"context"
	"errors"
	"hash/fnv"
	"io"
	"sync"
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
	wg             sync.WaitGroup
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
	topics := make([]string, 0, len(c.handlers))
	for topic := range c.handlers {
		topics = append(topics, topic)
	}

	workerChans := make([]chan kafka.Message, c.workers)
	doneChans := make([]chan struct{}, c.workers)
	for i := 0; i < c.workers; i++ {
		workerChans[i] = make(chan kafka.Message, 64)
		doneChans[i] = make(chan struct{})
		go c.worker(workerChans[i], doneChans[i], i)
	}

	c.wg.Add(1)
	go func() {
		defer c.wg.Done()
		c.runGroup(topics, workerChans)
		for _, ch := range workerChans {
			close(ch)
		}
		for _, d := range doneChans {
			<-d
		}
	}()

	c.logger.Infow("Kafka Consumer started", "topics", topics, "consumer_group", constants.KafkaConsumerGroup, "workers", c.workers)
	return nil
}

func (c *Consumer) runGroup(topics []string, workerChans []chan kafka.Message) {
	backoff := time.Second
	const maxBackoff = 30 * time.Second

	for {
		if c.ctx.Err() != nil {
			return
		}

		group, err := kafka.NewConsumerGroup(kafka.ConsumerGroupConfig{
			ID:                constants.KafkaConsumerGroup,
			Brokers:           c.cfg.KafkaBrokers,
			Topics:            topics,
			StartOffset:       kafka.FirstOffset,
			HeartbeatInterval: 3 * time.Second,
			SessionTimeout:    30 * time.Second,
			RebalanceTimeout:  30 * time.Second,
			RetentionTime:     7 * 24 * time.Hour,
		})
		if err != nil {
			c.logger.Warnw("Failed to create consumer group, retrying", "error", err, "backoff", backoff.String())
			if !c.sleep(backoff) {
				return
			}
			backoff = nextBackoff(backoff, maxBackoff)
			continue
		}

		err = c.runGenerations(group, workerChans)
		_ = group.Close()

		if c.ctx.Err() != nil {
			return
		}

		if err != nil && !errors.Is(err, kafka.ErrGroupClosed) {
			c.logger.Warnw("Consumer group exited, recreating", "error", err, "backoff", backoff.String())
			if !c.sleep(backoff) {
				return
			}
			backoff = nextBackoff(backoff, maxBackoff)
		} else {
			backoff = time.Second
		}
	}
}

func (c *Consumer) runGenerations(group *kafka.ConsumerGroup, workerChans []chan kafka.Message) error {
	for {
		gen, err := group.Next(c.ctx)
		if err != nil {
			return err
		}

		c.logger.Infow("Consumer group generation started",
			"generation_id", gen.ID,
			"member_id", gen.MemberID,
			"assignments", gen.Assignments,
		)

		commits := make(chan commitRequest, c.workers*32)
		gen.Start(func(ctx context.Context) {
			c.commitLoop(ctx, gen, commits)
		})

		for topic, partitions := range gen.Assignments {
			if _, ok := c.handlers[topic]; !ok {
				c.logger.Warnw("No handler for assigned topic", "topic", topic)
				continue
			}
			for _, assignment := range partitions {
				topic := topic
				partition := assignment.ID
				offset := assignment.Offset

				gen.Start(func(ctx context.Context) {
					c.fetchPartition(ctx, gen, topic, partition, offset, workerChans, commits)
				})
			}
		}
	}
}

func (c *Consumer) fetchPartition(
	ctx context.Context,
	gen *kafka.Generation,
	topic string,
	partition int,
	offset int64,
	workerChans []chan kafka.Message,
	commits chan<- commitRequest,
) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:   c.cfg.KafkaBrokers,
		Topic:     topic,
		Partition: partition,
		MinBytes:  1,
		MaxBytes:  10e6,
		MaxWait:   500 * time.Millisecond,
	})
	defer reader.Close()

	startOffset := offset
	if startOffset < 0 {
		startOffset = kafka.FirstOffset
	}
	if err := reader.SetOffset(startOffset); err != nil {
		c.logger.Errorw("Failed to set offset", "topic", topic, "partition", partition, "offset", startOffset, "error", err)
		return
	}

	c.logger.Infow("Fetching partition", "topic", topic, "partition", partition, "offset", startOffset, "generation_id", gen.ID)

	for {
		msg, err := reader.ReadMessage(ctx)
		if err != nil {
			if errors.Is(err, ctx.Err()) || errors.Is(err, context.Canceled) || errors.Is(err, io.EOF) {
				return
			}
			c.logger.Warnw("Read error, exiting partition fetcher",
				"topic", topic, "partition", partition, "error", err)
			return
		}

		idx := routeIndex(msg, c.workers)
		select {
		case workerChans[idx] <- msg:
		case <-ctx.Done():
			return
		}

		select {
		case commits <- commitRequest{topic: topic, partition: partition, offset: msg.Offset + 1}:
		case <-ctx.Done():
			return
		}
	}
}

type commitRequest struct {
	topic     string
	partition int
	offset    int64
}

func (c *Consumer) commitLoop(ctx context.Context, gen *kafka.Generation, commits <-chan commitRequest) {
	pending := make(map[string]map[int]int64)
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	flush := func() {
		if len(pending) == 0 {
			return
		}
		offsets := make(map[string]map[int]int64, len(pending))
		for t, parts := range pending {
			offsets[t] = make(map[int]int64, len(parts))
			for p, o := range parts {
				offsets[t][p] = o
			}
		}
		if err := gen.CommitOffsets(offsets); err != nil {
			c.logger.Errorw("Failed to commit offsets", "error", err)
			return
		}
		pending = make(map[string]map[int]int64)
	}

	for {
		select {
		case <-ctx.Done():
			flush()
			return
		case req, ok := <-commits:
			if !ok {
				flush()
				return
			}
			if pending[req.topic] == nil {
				pending[req.topic] = make(map[int]int64)
			}
			if existing, has := pending[req.topic][req.partition]; !has || req.offset > existing {
				pending[req.topic][req.partition] = req.offset
			}
		case <-ticker.C:
			flush()
		}
	}
}

func (c *Consumer) worker(in <-chan kafka.Message, done chan<- struct{}, workerID int) {
	defer close(done)
	c.logger.Debugw("Worker started", "worker_id", workerID)

	for msg := range in {
		handler, ok := c.handlers[msg.Topic]
		if !ok {
			c.logger.Warnw("No handler for topic", "topic", msg.Topic, "worker_id", workerID)
			continue
		}
		c.processMessage(handler, msg, workerID)
	}

	c.logger.Debugw("Worker stopped", "worker_id", workerID)
}

func (c *Consumer) processMessage(handler MessageHandler, msg kafka.Message, workerID int) {
	var lastErr error
	backoff := 100 * time.Millisecond

	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		msgCtx, cancel := context.WithTimeout(c.ctx, c.messageTimeout)
		err := handler(msgCtx, msg.Value)
		cancel()

		if err == nil {
			return
		}

		lastErr = err
		if attempt < c.maxRetries {
			c.logger.Warnw("Handler failed, retrying",
				"topic", msg.Topic,
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
		"topic", msg.Topic,
		"worker_id", workerID,
		"partition", msg.Partition,
		"offset", msg.Offset,
		"error", lastErr,
	)

	dlqCtx, dlqCancel := context.WithTimeout(c.ctx, 5*time.Second)
	dlqErr := c.producer.PublishToDLQ(dlqCtx, msg.Topic, string(msg.Key), msg.Value, lastErr.Error())
	dlqCancel()

	if dlqErr != nil {
		c.logger.Errorw("Failed to publish to DLQ", "topic", msg.Topic, "error", dlqErr)
	}
}

func (c *Consumer) sleep(d time.Duration) bool {
	select {
	case <-time.After(d):
		return true
	case <-c.ctx.Done():
		return false
	}
}

func nextBackoff(current, max time.Duration) time.Duration {
	next := current * 2
	if next > max {
		return max
	}
	return next
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

func (c *Consumer) Close() error {
	c.cancel()
	c.wg.Wait()
	c.logger.Info("Kafka Consumer closed")
	return nil
}
