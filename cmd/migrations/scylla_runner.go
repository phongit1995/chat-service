package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gocql/gocql"
)

type ScyllaMigration struct {
	Version   string
	Direction string
	FilePath  string
}

func RunScyllaMigration(cfg *Config) error {
	log.Println("🔄 Running ScyllaDB migrations...")
	log.Printf("   Target Keyspace: %s\n", cfg.ScyllaKeyspace)

	cluster := gocql.NewCluster(cfg.ScyllaHost)
	cluster.Port = cfg.ScyllaPort
	cluster.Consistency = parseConsistency(cfg.ScyllaConsistency)
	cluster.ProtoVersion = 4
	cluster.ConnectTimeout = 10 * time.Second
	cluster.Timeout = 10 * time.Second

	session, err := cluster.CreateSession()
	if err != nil {
		return fmt.Errorf("failed to connect to ScyllaDB: %w", err)
	}

	migrations, err := getScyllaMigrations()
	if err != nil {
		session.Close()
		return err
	}

	switch cfg.MigrationAction {
	case "up":
		for _, m := range migrations {
			if m.Direction == "up" {
				if err := executeCQLFileWithKeyspace(session, m.FilePath, cfg.ScyllaKeyspace); err != nil {
					session.Close()
					return fmt.Errorf("failed to execute migration %s: %w", m.Version, err)
				}
				log.Printf("✅ Applied migration: %s\n", m.Version)
			}
		}
		log.Println("✅ ScyllaDB migrations UP completed successfully")

	case "down":
		steps := cfg.MigrationSteps
		if steps == 0 {
			steps = 1
		}
		count := 0
		for i := len(migrations) - 1; i >= 0 && count < steps; i-- {
			m := migrations[i]
			if m.Direction == "down" {
				if err := executeCQLFileWithKeyspace(session, m.FilePath, cfg.ScyllaKeyspace); err != nil {
					session.Close()
					return fmt.Errorf("failed to execute migration %s: %w", m.Version, err)
				}
				log.Printf("✅ Rolled back migration: %s\n", m.Version)
				count++
			}
		}
		log.Printf("✅ ScyllaDB migrations DOWN (%d steps) completed successfully\n", count)

	case "version":
		if len(migrations) > 0 {
			lastUp := ""
			for _, m := range migrations {
				if m.Direction == "up" {
					lastUp = m.Version
				}
			}
			log.Printf("📊 ScyllaDB latest migration: %s\n", lastUp)
		} else {
			log.Println("📊 ScyllaDB: No migrations found")
		}

	default:
		session.Close()
		return fmt.Errorf("unknown migration action: %s", cfg.MigrationAction)
	}

	session.Close()
	return nil
}

func getScyllaMigrations() ([]ScyllaMigration, error) {
	migrationsDir := "cmd/migrations/scylla"
	var migrations []ScyllaMigration

	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		return nil, fmt.Errorf("failed to read migrations directory: %w", err)
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		name := file.Name()
		if !strings.HasSuffix(name, ".cql") {
			continue
		}

		parts := strings.Split(name, "_")
		if len(parts) < 2 {
			continue
		}

		version := parts[0]
		direction := "up"
		if strings.Contains(name, ".down.") {
			direction = "down"
		}

		migrations = append(migrations, ScyllaMigration{
			Version:   version,
			Direction: direction,
			FilePath:  filepath.Join(migrationsDir, name),
		})
	}

	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})

	return migrations, nil
}

func executeCQLFileWithKeyspace(session *gocql.Session, filePath string, keyspace string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read file %s: %w", filePath, err)
	}

	contentStr := string(content)
	contentStr = strings.ReplaceAll(contentStr, "chat_keyspace", keyspace)

	lines := strings.Split(contentStr, "\n")
	var cleanedLines []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" && !strings.HasPrefix(trimmed, "--") {
			cleanedLines = append(cleanedLines, line)
		}
	}
	contentStr = strings.Join(cleanedLines, "\n")

	statements := strings.Split(contentStr, ";")
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}

		if err := session.Query(stmt).Exec(); err != nil {
			return fmt.Errorf("failed to execute CQL: %s\nError: %w", stmt, err)
		}
	}

	return nil
}

func parseConsistency(consistency string) gocql.Consistency {
	switch consistency {
	case "ANY":
		return gocql.Any
	case "ONE":
		return gocql.One
	case "TWO":
		return gocql.Two
	case "THREE":
		return gocql.Three
	case "QUORUM":
		return gocql.Quorum
	case "ALL":
		return gocql.All
	case "LOCAL_QUORUM":
		return gocql.LocalQuorum
	case "EACH_QUORUM":
		return gocql.EachQuorum
	case "LOCAL_ONE":
		return gocql.LocalOne
	default:
		return gocql.Quorum
	}
}
