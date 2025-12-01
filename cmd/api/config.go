package main

import (
	"chat-server/internal/config"
	"fmt"
	"strings"

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
	}

	validate := validator.New()
	if err := validate.Struct(v); err != nil {
		return formatValidationError("API", err)
	}

	return nil
}

func formatValidationError(service string, err error) error {
	if validationErrs, ok := err.(validator.ValidationErrors); ok {
		var errMessages []string

		for _, e := range validationErrs {
			var message string

			field := e.Field()
			tag := e.Tag()
			param := e.Param()

			switch tag {
			case "required":
				message = fmt.Sprintf("'%s' is required", field)
			case "min":
				if e.Kind().String() == "slice" {
					message = fmt.Sprintf("'%s' must have at least %s items", field, param)
				} else {
					message = fmt.Sprintf("'%s' must be at least %s characters", field, param)
				}
			default:
				message = fmt.Sprintf("'%s' failed validation '%s'", field, tag)
			}

			errMessages = append(errMessages, message)
		}

		return fmt.Errorf("%s Service config validation failed:\n  - %s", service, strings.Join(errMessages, "\n  - "))
	}

	return fmt.Errorf("%s Service config validation failed: %w", service, err)
}
