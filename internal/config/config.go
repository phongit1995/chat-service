package config

import (
	"fmt"
	"strings"

	"github.com/caarlos0/env/v11"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
)

type Config struct {
	ServerHost string `env:"SERVER_HOST" envDefault:"0.0.0.0"`
	ServerPort int    `env:"SERVER_PORT" envDefault:"8080" validate:"min=1,max=65535"`
	Env        string `env:"GIN_MODE" envDefault:"debug" validate:"oneof=debug release test"`

	ChatPort int `env:"CHAT_PORT" envDefault:"8081" validate:"min=1,max=65535"`

	DBHost     string `env:"DB_HOST"`
	DBPort     int    `env:"DB_PORT" envDefault:"5432" validate:"omitempty,min=1,max=65535"`
	DBName     string `env:"DB_NAME"`
	DBUser     string `env:"DB_USER"`
	DBPassword string `env:"DB_PASSWORD"`
	DBSSLMode  string `env:"DB_SSL_MODE" envDefault:"disable" validate:"omitempty,oneof=disable enable require verify-ca verify-full"`

	RedisHost     string `env:"REDIS_HOST"`
	RedisPort     int    `env:"REDIS_PORT" envDefault:"6379" validate:"omitempty,min=1,max=65535"`
	RedisPassword string `env:"REDIS_PASSWORD"`
	RedisDB       int    `env:"REDIS_DB" envDefault:"0" validate:"min=0,max=15"`

	WebSocketRedisHost     string `env:"WEBSOCKET_REDIS_HOST"`
	WebSocketRedisPort     int    `env:"WEBSOCKET_REDIS_PORT" envDefault:"6379" validate:"omitempty,min=1,max=65535"`
	WebSocketRedisPassword string `env:"WEBSOCKET_REDIS_PASSWORD"`
	WebSocketRedisDB       int    `env:"WEBSOCKET_REDIS_DB" envDefault:"1" validate:"min=0,max=15"`

	ScyllaHost        string `env:"SCYLLA_HOST"`
	ScyllaPort        int    `env:"SCYLLA_PORT" envDefault:"9042" validate:"omitempty,min=1,max=65535"`
	ScyllaKeyspace    string `env:"SCYLLA_KEYSPACE"`
	ScyllaConsistency string `env:"SCYLLA_CONSISTENCY" envDefault:"QUORUM" validate:"omitempty,oneof=ANY ONE TWO THREE QUORUM ALL LOCAL_QUORUM EACH_QUORUM LOCAL_ONE"`

	JWTSecret string `env:"JWT_SECRET"`
	JWTExpiry string `env:"JWT_EXPIRY" envDefault:"24h"`

	CORSAllowedOrigins []string `env:"CORS_ALLOWED_ORIGINS" envSeparator:","`

	WSReadBufferSize  int `env:"WS_READ_BUFFER_SIZE" envDefault:"1024" validate:"min=1024"`
	WSWriteBufferSize int `env:"WS_WRITE_BUFFER_SIZE" envDefault:"1024" validate:"min=1024"`

	KafkaBrokers                  []string `env:"KAFKA_BROKERS" envSeparator:"," validate:"required,min=1"`
	KafkaConsumerGroup            string   `env:"KAFKA_CONSUMER_GROUP" envDefault:"chat-server-consumers"`
	KafkaTopicMessageCreated      string   `env:"KAFKA_TOPIC_MESSAGE_CREATED" envDefault:"chat.message.created"`
	KafkaTopicMessageDeleted      string   `env:"KAFKA_TOPIC_MESSAGE_DELETED" envDefault:"chat.message.deleted"`
	KafkaTopicConversationUpdated string   `env:"KAFKA_TOPIC_CONVERSATION_UPDATED" envDefault:"chat.conversation.updated"`
}

func LoadConfig() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{}

	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("failed to parse environment variables: %w", err)
	}

	for i := range cfg.CORSAllowedOrigins {
		cfg.CORSAllowedOrigins[i] = strings.TrimSpace(cfg.CORSAllowedOrigins[i])
	}

	validate := validator.New()
	if err := validate.Struct(cfg); err != nil {
		return nil, formatValidationError(err)
	}

	return cfg, nil
}

func formatValidationError(err error) error {
	if validationErrs, ok := err.(validator.ValidationErrors); ok {
		var errMessages []string

		for _, e := range validationErrs {
			var message string

			field := e.Field()
			tag := e.Tag()
			param := e.Param()

			switch tag {
			case "required":
				message = fmt.Sprintf("Field '%s' is required", field)
			case "min":
				if e.Type().Kind() == 17 {
					message = fmt.Sprintf("Field '%s' must have at least %s items", field, param)
				} else {
					message = fmt.Sprintf("Field '%s' must be at least %s", field, param)
				}
			case "max":
				message = fmt.Sprintf("Field '%s' must be at most %s", field, param)
			case "oneof":
				message = fmt.Sprintf("Field '%s' must be one of: %s", field, param)
			default:
				message = fmt.Sprintf("Field '%s' failed validation '%s'", field, tag)
			}

			errMessages = append(errMessages, message)
		}

		return fmt.Errorf("config validation failed:\n  - %s", strings.Join(errMessages, "\n  - "))
	}

	return fmt.Errorf("config validation failed: %w", err)
}
