package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/jackc/pgx/v5/stdlib"

	"chat-server/cmd/migrations/seed"
)

func RunSeed(cfg *Config) error {
	log.Println("🌱 Running Database Seeder...")

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		cfg.DBUser,
		cfg.DBPassword,
		cfg.DBHost,
		cfg.DBPort,
		cfg.DBName,
		cfg.DBSSLMode,
	)

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to PostgreSQL: %w", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping PostgreSQL: %w", err)
	}

	log.Println("✅ Connected to PostgreSQL")

	if err := seed.SeedUsers(db, 100); err != nil {
		return fmt.Errorf("failed to seed users: %w", err)
	}

	log.Println()
	log.Println("📋 Test Credentials:")
	log.Println("   Email: test1@gmail.com to test100@gmail.com")
	log.Println("   Password: 123456")
	log.Println()

	return nil
}
