package main

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
	"chat-server/internal/logger"
	kafkaModule "chat-server/internal/modules/kafka"
	"chat-server/internal/modules/websocket"
	"chat-server/internal/services"

	"go.uber.org/dig"
	"go.uber.org/zap"
)

func provideConfig() (*config.Config, error) {
	return LoadChatConfig()
}

func provideChatKafkaConsumer(cfg *config.Config, logger *zap.SugaredLogger) *kafkaModule.Consumer {
	return kafkaModule.NewConsumer(cfg, logger, constants.KafkaConsumerGroup)
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

	if err := websocket.Provider(c); err != nil {
		return nil, err
	}

	return c, nil
}
