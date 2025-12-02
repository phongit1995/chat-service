package db

import (
	"chat-server/internal/config"
	"fmt"
	"time"

	"github.com/gocql/gocql"
	"go.uber.org/zap"
)

func NewScyllaDB(cfg *config.Config, log *zap.SugaredLogger) (*gocql.Session, error) {
	cluster := gocql.NewCluster(cfg.ScyllaHost)
	cluster.Port = cfg.ScyllaPort
	cluster.Consistency = parseConsistency(cfg.ScyllaConsistency)
	cluster.ProtoVersion = 4
	cluster.ConnectTimeout = 10 * time.Second
	cluster.Timeout = 10 * time.Second
	cluster.NumConns = 2
	cluster.SocketKeepalive = 10 * time.Second
	cluster.MaxWaitSchemaAgreement = 60 * time.Second

	session, err := cluster.CreateSession()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to ScyllaDB: %w", err)
	}

	if err := createKeyspaceIfNotExists(session, cfg.ScyllaKeyspace, log); err != nil {
		session.Close()
		return nil, err
	}

	session.Close()

	cluster.Keyspace = cfg.ScyllaKeyspace
	session, err = cluster.CreateSession()
	if err != nil {
		return nil, fmt.Errorf("failed to reconnect to keyspace: %w", err)
	}

	// NOTE: Database schema is managed by migrations (cmd/migrations/)
	// InitChatSchema is no longer called here

	log.Infof("✅ Connected to ScyllaDB successfully (keyspace: %s)", cfg.ScyllaKeyspace)

	return session, nil
}

func createKeyspaceIfNotExists(session *gocql.Session, keyspace string, log *zap.SugaredLogger) error {
	query := fmt.Sprintf(`
		CREATE KEYSPACE IF NOT EXISTS %s
		WITH replication = {
			'class': 'SimpleStrategy',
			'replication_factor': 1
		}
	`, keyspace)

	if err := session.Query(query).Exec(); err != nil {
		return fmt.Errorf("failed to create keyspace: %w", err)
	}

	log.Infof("✅ Keyspace '%s' is ready", keyspace)
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
