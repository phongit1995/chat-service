package config

import (
	"fmt"
	"strings"

	"chat-server/internal/utils"

	"github.com/caarlos0/env/v11"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
)

type Config struct {
	ServerHost  string `env:"SERVER_HOST" envDefault:"0.0.0.0"`
	ServerPort  int    `env:"SERVER_PORT" envDefault:"8080" validate:"min=1,max=65535"`
	Env         string `env:"GIN_MODE" envDefault:"debug" validate:"oneof=debug release test"`
	ServiceName string `env:"SERVICE_NAME" envDefault:"chat-service"`

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

	KafkaBrokers           []string `env:"KAFKA_BROKERS" envSeparator:"," validate:"required,min=1"`
	KafkaConsumerWorkers   int      `env:"KAFKA_CONSUMER_WORKERS" envDefault:"10" validate:"min=1,max=100"`
	KafkaMessageTimeoutSec int      `env:"KAFKA_MESSAGE_TIMEOUT_SEC" envDefault:"10" validate:"min=1,max=300"`

	MinIOEndpoint  string `env:"MINIO_ENDPOINT" envDefault:"localhost:9000"`
	MinIOAccessKey string `env:"MINIO_ACCESS_KEY"`
	MinIOSecretKey string `env:"MINIO_SECRET_KEY"`
	MinIOBucket    string `env:"MINIO_BUCKET" envDefault:"chat-uploads"`
	MinIOUseSSL    bool   `env:"MINIO_USE_SSL" envDefault:"false"`
	MinIOPublicURL string `env:"MINIO_PUBLIC_URL" envDefault:""`

	LiveKitURL              string `env:"LIVEKIT_URL" envDefault:""`
	LiveKitAPIKey           string `env:"LIVEKIT_API_KEY" envDefault:""`
	LiveKitAPISecret        string `env:"LIVEKIT_API_SECRET" envDefault:""`
	CallRingTimeoutSeconds  int    `env:"CALL_RING_TIMEOUT_SECONDS" envDefault:"30" validate:"min=2,max=300"`

	MessageDeleteWindowSeconds int `env:"MESSAGE_DELETE_WINDOW_SECONDS" envDefault:"7200" validate:"min=0"`
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
		return nil, utils.FormatValidationError("", err)
	}

	return cfg, nil
}
