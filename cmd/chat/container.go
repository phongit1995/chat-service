package main

import (
	"chat-server/internal/config"
	"chat-server/internal/logger"
	"chat-server/internal/modules/websocket"
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
		services.NewJWTService,
		services.NewKafkaConsumer,
	}

	for _, p := range providers {
		if err := c.Provide(p); err != nil {
			return nil, err
		}
	}

	if err := websocket.Provider(c); err != nil {
		return nil, err
	}

	return c, nil
}
