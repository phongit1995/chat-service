package main

import (
	"log"
	"os"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string `env:"DB_HOST" envDefault:"localhost"`
	DBPort     int    `env:"DB_PORT" envDefault:"5432"`
	DBUser     string `env:"DB_USER" envDefault:"postgres"`
	DBPassword string `env:"DB_PASSWORD" envDefault:"postgres"`
	DBName     string `env:"DB_NAME" envDefault:"chat_db"`
	DBSSLMode  string `env:"DB_SSL_MODE" envDefault:"disable"`

	ScyllaHost        string `env:"SCYLLA_HOST" envDefault:"localhost"`
	ScyllaPort        int    `env:"SCYLLA_PORT" envDefault:"9042"`
	ScyllaKeyspace    string `env:"SCYLLA_KEYSPACE" envDefault:"chat_server"`
	ScyllaConsistency string `env:"SCYLLA_CONSISTENCY" envDefault:"QUORUM"`

	MigrationAction string `env:"MIGRATION_ACTION" envDefault:"up"`
	MigrateDB       string `env:"MIGRATE_DB" envDefault:"all"`
	MigrationSteps  int    `env:"MIGRATION_STEPS" envDefault:"0"`
}

func LoadConfig() *Config {
	_ = godotenv.Load()

	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		log.Fatalf("Failed to parse config: %v", err)
	}

	if len(os.Args) > 1 {
		cfg.MigrationAction = os.Args[1]
	}
	if len(os.Args) > 2 {
		cfg.MigrateDB = os.Args[2]
	}

	return cfg
}
