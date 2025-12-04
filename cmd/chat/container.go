package main

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
	"chat-server/internal/infra/kafka"
	"chat-server/internal/infra/websocket"
	"chat-server/internal/logger"
	"chat-server/internal/services"

	"go.uber.org/dig"
	"go.uber.org/zap"
)

func provideConfig() (*config.Config, error) {
	return LoadChatConfig()
}

func provideChatKafkaConsumer(cfg *config.Config, logger *zap.SugaredLogger) *kafka.Consumer {
	return kafka.NewConsumer(cfg, logger, constants.KafkaConsumerGroup)
}

func NewContainer() (*dig.Container, error) {
	c := dig.New()

	providers := []interface{}{
		provideConfig,
		logger.CreateLogger,
		services.NewJWTService,
		provideChatKafkaConsumer,
	}

	for _, p := range providers {
		if err := c.Provide(p); err != nil {
			return nil, err
		}
	}

	modules := []func(*dig.Container) error{
		websocket.Provider,
		kafka.ProvideConsumer,
	}

	for _, module := range modules {
		if err := module(c); err != nil {
			return nil, err
		}
	}

	return c, nil
}
