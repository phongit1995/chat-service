package main

import (
	"chat-server/internal/config"
	"fmt"

	"github.com/go-playground/validator/v10"
)

type APIServiceConfig struct {
	*config.Config
}

type APIConfigValidator struct {
	DBHost              string   `validate:"required"`
	DBName              string   `validate:"required"`
	DBUser              string   `validate:"required"`
	DBPassword          string   `validate:"required"`
	RedisHost           string   `validate:"required"`
	WebSocketRedisHost  string   `validate:"required"`
	ScyllaHost          string   `validate:"required"`
	ScyllaKeyspace      string   `validate:"required"`
	JWTSecret           string   `validate:"required,min=32"`
	CORSAllowedOrigins  []string `validate:"required,min=1"`
}

func LoadAPIConfig() (*APIServiceConfig, error) {
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, err
	}

	return &APIServiceConfig{Config: cfg}, nil
}

func (c *APIServiceConfig) Validate() error {
	validatorStruct := &APIConfigValidator{
		DBHost:             c.DBHost,
		DBName:             c.DBName,
		DBUser:             c.DBUser,
		DBPassword:         c.DBPassword,
		RedisHost:          c.RedisHost,
		WebSocketRedisHost: c.WebSocketRedisHost,
		ScyllaHost:         c.ScyllaHost,
		ScyllaKeyspace:     c.ScyllaKeyspace,
		JWTSecret:          c.JWTSecret,
		CORSAllowedOrigins: c.CORSAllowedOrigins,
	}

	validate := validator.New()
	if err := validate.Struct(validatorStruct); err != nil {
		return fmt.Errorf("API Service config validation failed: %w", err)
	}

	return nil
}
