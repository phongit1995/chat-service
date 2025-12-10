package main

import (
	"chat-server/internal/config"
	"chat-server/internal/db"
	"chat-server/internal/infra/kafka"
	"chat-server/internal/infra/websocket"
	"chat-server/internal/logger"
	"chat-server/internal/middleware"
	"chat-server/internal/modules/auth"
	"chat-server/internal/modules/conversation"
	"chat-server/internal/modules/health"
	"chat-server/internal/modules/message"
	"chat-server/internal/modules/relationships"
	"chat-server/internal/modules/user"
	"chat-server/internal/services"

	"go.uber.org/dig"
)

func provideConfig() (*config.Config, error) {
	return LoadAPIConfig()
}

func NewContainer() (*dig.Container, error) {
	c := dig.New()
	providers := []interface{}{
		provideConfig,
		logger.CreateLogger,
		db.NewPostgresDB,
		db.NewScyllaDB,
		services.NewCacheService,
		services.NewJWTService,
		services.NewCloudinaryService,
		middleware.NewAuthMiddleware,
		CreateServer,
	}

	for _, p := range providers {
		if err := c.Provide(p); err != nil {
			return nil, err
		}
	}

	modules := []func(*dig.Container) error{
		kafka.ProvideProducer,
		websocket.Provider,
		auth.Provider,
		health.Provider,
		user.Provider,
		relationships.Provider,
		conversation.Provider,
		message.Provider,
	}

	for _, module := range modules {
		if err := module(c); err != nil {
			return nil, err
		}
	}

	return c, nil
}
