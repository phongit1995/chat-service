package main

import (
	"chat-server/internal/config"
	"chat-server/internal/utils"

	"github.com/go-playground/validator/v10"
)

type APIConfigValidator struct {
	DBHost             string   `validate:"required"`
	DBName             string   `validate:"required"`
	DBUser             string   `validate:"required"`
	DBPassword         string   `validate:"required"`
	RedisHost          string   `validate:"required"`
	WebSocketRedisHost string   `validate:"required"`
	ScyllaHost         string   `validate:"required"`
	ScyllaKeyspace     string   `validate:"required"`
	JWTSecret          string   `validate:"required,min=32"`
	CORSAllowedOrigins []string `validate:"required,min=1"`
	KafkaBrokers       []string `validate:"required,min=1"`
	CloudinaryURL      string   `validate:"required"`
}

func LoadAPIConfig() (*config.Config, error) {
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, err
	}

	if err := validateAPIConfig(cfg); err != nil {
		return nil, err
	}

	return cfg, nil
}

func validateAPIConfig(cfg *config.Config) error {
	v := &APIConfigValidator{
		DBHost:             cfg.DBHost,
		DBName:             cfg.DBName,
		DBUser:             cfg.DBUser,
		DBPassword:         cfg.DBPassword,
		RedisHost:          cfg.RedisHost,
		WebSocketRedisHost: cfg.WebSocketRedisHost,
		ScyllaHost:         cfg.ScyllaHost,
		ScyllaKeyspace:     cfg.ScyllaKeyspace,
		JWTSecret:          cfg.JWTSecret,
		CORSAllowedOrigins: cfg.CORSAllowedOrigins,
		KafkaBrokers:       cfg.KafkaBrokers,
		CloudinaryURL:      cfg.CloudinaryURL,
	}

	validate := validator.New()
	if err := validate.Struct(v); err != nil {
		return utils.FormatValidationError("API", err)
	}

	return nil
}
