package main

import (
	"chat-server/internal/config"
	"fmt"

	"github.com/go-playground/validator/v10"
)

type ChatServiceConfig struct {
	*config.Config
}

type ChatConfigValidator struct {
	WebSocketRedisHost string `validate:"required"`
	JWTSecret          string `validate:"required,min=32"`
}

func LoadChatConfig() (*ChatServiceConfig, error) {
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, err
	}

	return &ChatServiceConfig{Config: cfg}, nil
}

func (c *ChatServiceConfig) Validate() error {
	validatorStruct := &ChatConfigValidator{
		WebSocketRedisHost: c.WebSocketRedisHost,
		JWTSecret:          c.JWTSecret,
	}

	validate := validator.New()
	if err := validate.Struct(validatorStruct); err != nil {
		return fmt.Errorf("Chat Service config validation failed: %w", err)
	}

	return nil
}
