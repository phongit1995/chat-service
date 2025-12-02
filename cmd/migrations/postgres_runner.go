package main

import (
	"database/sql"
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func RunPostgresMigration(cfg *Config) error {
	log.Println("🔄 Running PostgreSQL migrations...")

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

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create postgres driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://cmd/migrations/postgres",
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	switch cfg.MigrationAction {
	case "up":
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			return fmt.Errorf("failed to run up migration: %w", err)
		}
		log.Println("✅ PostgreSQL migrations UP completed successfully")

	case "down":
		steps := cfg.MigrationSteps
		if steps == 0 {
			steps = 1
		}
		if err := m.Steps(-steps); err != nil && err != migrate.ErrNoChange {
			return fmt.Errorf("failed to run down migration: %w", err)
		}
		log.Printf("✅ PostgreSQL migrations DOWN (%d steps) completed successfully\n", steps)

	case "version":
		version, dirty, err := m.Version()
		if err != nil && err != migrate.ErrNilVersion {
			return fmt.Errorf("failed to get version: %w", err)
		}
		log.Printf("📊 PostgreSQL migration version: %d (dirty: %v)\n", version, dirty)

	case "force":
		if cfg.MigrationSteps == 0 {
			return fmt.Errorf("force requires version number in MIGRATION_STEPS")
		}
		if err := m.Force(cfg.MigrationSteps); err != nil {
			return fmt.Errorf("failed to force version: %w", err)
		}
		log.Printf("✅ PostgreSQL migration forced to version: %d\n", cfg.MigrationSteps)

	default:
		return fmt.Errorf("unknown migration action: %s", cfg.MigrationAction)
	}

	return nil
}
