package main

import (
	"chat-server/internal/config"
	"chat-server/internal/infra/kafka"
	"chat-server/internal/infra/websocket"
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
		kafka.ProvideConsumer, // This already provides conversationDomain & messageDomain
	}

	for _, module := range modules {
		if err := module(c); err != nil {
			return nil, err
		}
	}

	return c, nil
}
