package main

import (
	"chat-server/internal/config"
	"chat-server/internal/transport/kafka"
	"chat-server/internal/transport/websocket"
	"chat-server/internal/logger"
	"chat-server/internal/services"

	"go.uber.org/dig"
)

func provideConfig() (*config.Config, error) {
	return LoadChatConfig()
}

func NewContainer() (*dig.Container, error) {
	c := dig.New()

	providers := []interface{}{
		provideConfig,
		logger.CreateLogger,
		services.NewCacheService,
		services.NewJWTService,
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
