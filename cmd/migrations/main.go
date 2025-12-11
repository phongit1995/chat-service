package main

import (
	"fmt"
	"log"
	"os"
)

func main() {
	cfg := LoadConfig()

	if cfg.MigrationAction == "seed" {
		log.Println("🌱 Starting Database Seeder...")
		if err := RunSeed(cfg); err != nil {
			log.Printf("❌ Seed failed: %v\n", err)
			os.Exit(1)
		}
		log.Println("🎉 Seed completed successfully!")
		return
	}

	log.Println("🚀 Starting Migration Service...")

	if cfg.MigrateDB == "" {
		cfg.MigrateDB = "all"
	}

	log.Printf("📋 Migration Config:")
	log.Printf("   Action: %s", cfg.MigrationAction)
	log.Printf("   Target: %s", cfg.MigrateDB)
	log.Printf("   Steps: %d", cfg.MigrationSteps)
	log.Println()

	var hasError bool

	switch cfg.MigrateDB {
	case "postgres":
		if err := RunPostgresMigration(cfg); err != nil {
			log.Printf("❌ PostgreSQL migration failed: %v\n", err)
			hasError = true
		}

	case "scylla":
		if err := RunScyllaMigration(cfg); err != nil {
			log.Printf("❌ ScyllaDB migration failed: %v\n", err)
			hasError = true
		}

	case "all":
		if err := RunPostgresMigration(cfg); err != nil {
			log.Printf("❌ PostgreSQL migration failed: %v\n", err)
			hasError = true
		}

		if err := RunScyllaMigration(cfg); err != nil {
			log.Printf("❌ ScyllaDB migration failed: %v\n", err)
			hasError = true
		}

	default:
		log.Printf("❌ Unknown database target: %s (use: postgres, scylla, or all)\n", cfg.MigrateDB)
		log.Printf("⚠️  Defaulting to 'all' - running all migrations\n")
		cfg.MigrateDB = "all"

		if err := RunPostgresMigration(cfg); err != nil {
			log.Printf("❌ PostgreSQL migration failed: %v\n", err)
			hasError = true
		}

		if err := RunScyllaMigration(cfg); err != nil {
			log.Printf("❌ ScyllaDB migration failed: %v\n", err)
			hasError = true
		}
	}

	if hasError {
		log.Println("❌ Migration completed with errors")
		os.Exit(1)
	}

	log.Println("🎉 All migrations completed successfully!")
}

func printUsage() {
	fmt.Print(`
Usage: ./migrations [action] [database]

Actions:
  up      - Apply all pending migrations (default)
  down    - Rollback migrations (specify MIGRATION_STEPS env var)
  version - Show current migration version
  force   - Force set migration version (requires MIGRATION_STEPS env var)
  seed    - Seed database with test data

Database:
  postgres - Run PostgreSQL migrations only
  scylla   - Run ScyllaDB migrations only
  all      - Run all migrations (default)

Environment Variables:
  MIGRATION_ACTION  - Migration action (default: up)
  MIGRATE_DB        - Target database (default: all)
  MIGRATION_STEPS   - Number of steps for down/force (default: 0)

Examples:
  ./migrations up all                    # Apply all migrations
  ./migrations down postgres              # Rollback 1 step for PostgreSQL
  MIGRATION_STEPS=2 ./migrations down all # Rollback 2 steps for all databases
  ./migrations version all                # Show current versions
  ./migrations seed                       # Seed 100 test users
`)
}
