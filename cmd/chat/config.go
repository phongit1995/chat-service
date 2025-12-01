package main

import (
	"chat-server/internal/config"
	"fmt"
	"strings"

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
		return formatValidationError("Chat", err)
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
