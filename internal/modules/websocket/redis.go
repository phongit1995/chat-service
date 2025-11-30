package websocket

import (
	"context"
	"fmt"
	"time"

	"chat-server/internal/config"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type RedisService struct {
	client *redis.Client
	logger *zap.SugaredLogger
	ctx    context.Context
}

func NewRedisService(cfg *config.Config, logger *zap.SugaredLogger) (*RedisService, error) {
	ctx := context.Background()

	client := redis.NewClient(&redis.Options{
		Addr:         fmt.Sprintf("%s:%d", cfg.WebSocketRedisHost, cfg.WebSocketRedisPort),
		Password:     cfg.WebSocketRedisPassword,
		DB:           cfg.WebSocketRedisDB,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolSize:     20,
		MinIdleConns: 10,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to WebSocket Redis: %w", err)
	}

	logger.Info("✅ Connected to WebSocket Redis successfully")

	return &RedisService{
		client: client,
		logger: logger.Named("[websocket_redis]"),
		ctx:    ctx,
	}, nil
}

func (s *RedisService) GetClient() *redis.Client {
	return s.client
}

func (s *RedisService) GetContext() context.Context {
	return s.ctx
}

func (s *RedisService) Close() error {
	return s.client.Close()
}
