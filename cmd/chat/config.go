package main

import (
	"chat-server/internal/config"
	"chat-server/internal/utils"

	"github.com/go-playground/validator/v10"
)

type ChatConfigValidator struct {
	WebSocketRedisHost string   `validate:"required"`
	JWTSecret          string   `validate:"required,min=32"`
	KafkaBrokers       []string `validate:"required,min=1"`
}

func LoadChatConfig() (*config.Config, error) {
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, err
	}

	if err := validateChatConfig(cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}

func validateChatConfig(cfg *config.Config) error {
	v := &ChatConfigValidator{
		WebSocketRedisHost: cfg.WebSocketRedisHost,
		JWTSecret:          cfg.JWTSecret,
		KafkaBrokers:       cfg.KafkaBrokers,
	}

	validate := validator.New()
	if err := validate.Struct(v); err != nil {
		return utils.FormatValidationError("Chat", err)
	}

	return nil
}
