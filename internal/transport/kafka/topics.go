package kafka

import (
	"context"
	"errors"
	"fmt"
	"net"
	"strconv"
	"time"

	"github.com/segmentio/kafka-go"
	"go.uber.org/zap"
)

const (
	defaultPartitions        = 3
	defaultReplicationFactor = 1
	dlqSuffix                = ".DLQ"
)

type TopicSpec struct {
	Name              string
	Partitions        int
	ReplicationFactor int
	RetentionMs       int64
	Compression       string
}

func DefaultTopicSpecs(topics []string) []TopicSpec {
	specs := make([]TopicSpec, 0, len(topics)*2)
	for _, t := range topics {
		specs = append(specs, TopicSpec{
			Name:              t,
			Partitions:        defaultPartitions,
			ReplicationFactor: defaultReplicationFactor,
			RetentionMs:       7 * 24 * 60 * 60 * 1000,
			Compression:       "lz4",
		})
		specs = append(specs, TopicSpec{
			Name:              t + dlqSuffix,
			Partitions:        1,
			ReplicationFactor: defaultReplicationFactor,
			RetentionMs:       30 * 24 * 60 * 60 * 1000,
		})
	}
	return specs
}

func EnsureTopics(ctx context.Context, brokers []string, specs []TopicSpec, logger *zap.SugaredLogger) error {
	if len(brokers) == 0 {
		return errors.New("no brokers configured")
	}

	configs := make([]kafka.TopicConfig, 0, len(specs))
	for _, s := range specs {
		entries := []kafka.ConfigEntry{
			{ConfigName: "retention.ms", ConfigValue: strconv.FormatInt(s.RetentionMs, 10)},
		}
		if s.Compression != "" {
			entries = append(entries, kafka.ConfigEntry{ConfigName: "compression.type", ConfigValue: s.Compression})
		}
		configs = append(configs, kafka.TopicConfig{
			Topic:             s.Name,
			NumPartitions:     s.Partitions,
			ReplicationFactor: s.ReplicationFactor,
			ConfigEntries:     entries,
		})
	}

	const maxAttempts = 10
	backoff := time.Second
	var lastErr error

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		if err := ctx.Err(); err != nil {
			return err
		}

		conn, err := dialController(ctx, brokers)
		if err != nil {
			lastErr = err
			logger.Warnw("Kafka not reachable yet, retrying", "attempt", attempt, "error", err, "backoff", backoff.String())
		} else {
			err = conn.CreateTopics(configs...)
			conn.Close()
			if err == nil {
				logger.Infow("Kafka topics ensured", "count", len(configs))
				return nil
			}
			lastErr = err
			logger.Warnw("CreateTopics failed, retrying", "attempt", attempt, "error", err, "backoff", backoff.String())
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(backoff):
		}
		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
	return fmt.Errorf("ensure topics failed after %d attempts: %w", maxAttempts, lastErr)
}

func dialController(ctx context.Context, brokers []string) (*kafka.Conn, error) {
	deadline, ok := ctx.Deadline()
	if !ok {
		deadline = time.Now().Add(10 * time.Second)
	}

	dialer := &kafka.Dialer{
		Timeout:   10 * time.Second,
		DualStack: true,
		Deadline:  deadline,
	}

	var lastErr error
	for _, b := range brokers {
		conn, err := dialer.DialContext(ctx, "tcp", b)
		if err != nil {
			lastErr = err
			continue
		}
		controller, err := conn.Controller()
		conn.Close()
		if err != nil {
			lastErr = err
			continue
		}

		ctrlAddr := net.JoinHostPort(controller.Host, strconv.Itoa(controller.Port))
		ctrlConn, err := dialer.DialContext(ctx, "tcp", ctrlAddr)
		if err != nil {
			lastErr = err
			continue
		}
		return ctrlConn, nil
	}
	return nil, fmt.Errorf("could not reach any broker controller: %w", lastErr)
}
