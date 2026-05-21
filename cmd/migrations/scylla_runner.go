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

	if err := ensureScyllaTracker(session, cfg.ScyllaKeyspace); err != nil {
		session.Close()
		return fmt.Errorf("failed to ensure schema_migrations table: %w", err)
	}

	applied, err := loadAppliedScyllaVersions(session, cfg.ScyllaKeyspace)
	if err != nil {
		session.Close()
		return fmt.Errorf("failed to load applied migrations: %w", err)
	}

	switch cfg.MigrationAction {
	case "up":
		applyCount := 0
		for _, m := range migrations {
			if m.Direction != "up" {
				continue
			}
			if applied[m.Version] {
				log.Printf("⏭️  Skip already applied: %s\n", m.Version)
				continue
			}
			if err := executeCQLFileWithKeyspace(session, m.FilePath, cfg.ScyllaKeyspace); err != nil {
				session.Close()
				return fmt.Errorf("failed to execute migration %s: %w", m.Version, err)
			}
			if err := recordAppliedScyllaVersion(session, cfg.ScyllaKeyspace, m.Version); err != nil {
				session.Close()
				return fmt.Errorf("applied migration %s but failed to record: %w", m.Version, err)
			}
			applied[m.Version] = true
			applyCount++
			log.Printf("✅ Applied migration: %s\n", m.Version)
		}
		if applyCount == 0 {
			log.Println("✅ ScyllaDB migrations UP: nothing to apply (all up-to-date)")
		} else {
			log.Printf("✅ ScyllaDB migrations UP completed successfully (%d applied)\n", applyCount)
		}

	case "down":
		steps := cfg.MigrationSteps
		if steps == 0 {
			steps = 1
		}
		count := 0
		for i := len(migrations) - 1; i >= 0 && count < steps; i-- {
			m := migrations[i]
			if m.Direction != "down" {
				continue
			}
			if !applied[m.Version] {
				log.Printf("⏭️  Skip rollback (not applied): %s\n", m.Version)
				continue
			}
			if err := executeCQLFileWithKeyspace(session, m.FilePath, cfg.ScyllaKeyspace); err != nil {
				session.Close()
				return fmt.Errorf("failed to execute migration %s: %w", m.Version, err)
			}
			if err := removeAppliedScyllaVersion(session, cfg.ScyllaKeyspace, m.Version); err != nil {
				session.Close()
				return fmt.Errorf("rolled back migration %s but failed to remove record: %w", m.Version, err)
			}
			delete(applied, m.Version)
			count++
			log.Printf("✅ Rolled back migration: %s\n", m.Version)
		}
		log.Printf("✅ ScyllaDB migrations DOWN (%d steps) completed successfully\n", count)

	case "version":
		latestApplied := ""
		for _, m := range migrations {
			if m.Direction == "up" && applied[m.Version] && m.Version > latestApplied {
				latestApplied = m.Version
			}
		}
		if latestApplied == "" {
			log.Println("📊 ScyllaDB: No migrations applied yet")
		} else {
			log.Printf("📊 ScyllaDB latest applied migration: %s\n", latestApplied)
		}

	default:
		session.Close()
		return fmt.Errorf("unknown migration action: %s", cfg.MigrationAction)
	}

	session.Close()
	return nil
}

func ensureScyllaTracker(session *gocql.Session, keyspace string) error {
	createKeyspace := fmt.Sprintf(
		"CREATE KEYSPACE IF NOT EXISTS %s WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 1}",
		keyspace,
	)
	if err := session.Query(createKeyspace).Exec(); err != nil {
		return fmt.Errorf("create keyspace: %w", err)
	}
	createTable := fmt.Sprintf(
		"CREATE TABLE IF NOT EXISTS %s.schema_migrations (version text PRIMARY KEY, applied_at timestamp)",
		keyspace,
	)
	return session.Query(createTable).Exec()
}

func loadAppliedScyllaVersions(session *gocql.Session, keyspace string) (map[string]bool, error) {
	applied := make(map[string]bool)
	iter := session.Query(
		fmt.Sprintf("SELECT version FROM %s.schema_migrations", keyspace),
	).Iter()
	var version string
	for iter.Scan(&version) {
		applied[version] = true
	}
	if err := iter.Close(); err != nil {
		return nil, err
	}
	return applied, nil
}

func recordAppliedScyllaVersion(session *gocql.Session, keyspace, version string) error {
	return session.Query(
		fmt.Sprintf("INSERT INTO %s.schema_migrations (version, applied_at) VALUES (?, ?)", keyspace),
		version, time.Now().UTC(),
	).Exec()
}

func removeAppliedScyllaVersion(session *gocql.Session, keyspace, version string) error {
	return session.Query(
		fmt.Sprintf("DELETE FROM %s.schema_migrations WHERE version = ?", keyspace),
		version,
	).Exec()
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
