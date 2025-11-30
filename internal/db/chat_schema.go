package db

import (
	"fmt"

	"github.com/gocql/gocql"
	"go.uber.org/zap"
)

func InitChatSchema(session *gocql.Session, keyspace string, log *zap.SugaredLogger) error {
	log.Info("🔄 Initializing ScyllaDB chat schema...")

	queries := []string{
		// 1. conversations - Metadata table only
		`CREATE TABLE IF NOT EXISTS conversations (
			conversation_id    uuid PRIMARY KEY,
			type               text,
			name               text,
			avatar             text,
			created_by         uuid,
			created_at         timestamp,
			updated_at         timestamp,
			participant_count  int
		)`,

		// 2. conversation_members_by_conversation - Members partitioned by conversation
		`CREATE TABLE IF NOT EXISTS conversation_members_by_conversation (
			conversation_id uuid,
			user_id         uuid,
			joined_at       timestamp,
			left_at         timestamp,
			is_active       boolean,
			role            text,
			PRIMARY KEY (conversation_id, user_id)
		)`,

		// 3. conversations_by_user - MOST IMPORTANT TABLE FOR INBOX VIEW
		// Partitioned by user_id, denormalized data for fast queries
		// No JOINs, no ALLOW FILTERING needed
		`CREATE TABLE IF NOT EXISTS conversations_by_user (
			user_id              uuid,
			last_message_at      timeuuid,
			conversation_id      uuid,
			is_group             boolean,
			other_user_id        uuid,
			other_user_name      text,
			other_user_avatar    text,
			title                text,
			avatar               text,
			last_message_id      timeuuid,
			last_message_body    text,
			last_message_sender  uuid,
			unread_count         int,
			last_read_message_id timeuuid,
			last_read_at         timestamp,
			PRIMARY KEY (user_id, last_message_at, conversation_id)
		) WITH CLUSTERING ORDER BY (last_message_at DESC, conversation_id ASC)`,

		// 4. messages_by_conversation - Messages partitioned by conversation
		// Use timeuuid for message_id to get natural time ordering
		`CREATE TABLE IF NOT EXISTS messages_by_conversation (
			conversation_id uuid,
			message_id      timeuuid,
			sender_id       uuid,
			message_type    text,
			content         text,
			metadata        text,
			status          text,
			created_at      timestamp,
			updated_at      timestamp,
			deleted_at      timestamp,
			reply_to_id     uuid,
			PRIMARY KEY (conversation_id, message_id)
		) WITH CLUSTERING ORDER BY (message_id DESC)`,

		// 5. conversation_read_by_user - Track read state per user
		`CREATE TABLE IF NOT EXISTS conversation_read_by_user (
			conversation_id      uuid,
			user_id              uuid,
			last_read_message_id timeuuid,
			last_read_at         timestamp,
			PRIMARY KEY (conversation_id, user_id)
		)`,

		// 6. direct_conversations_by_user_pair - Fast lookup for 1-1 chats
		// Prevents duplicate direct conversations between same users
		`CREATE TABLE IF NOT EXISTS direct_conversations_by_user_pair (
			user_a          uuid,
			user_b          uuid,
			conversation_id uuid,
			PRIMARY KEY (user_a, user_b)
		)`,
	}

	for i, query := range queries {
		if err := session.Query(query).Exec(); err != nil {
			return fmt.Errorf("failed to execute query %d: %w", i+1, err)
		}
	}

	log.Info("✅ ScyllaDB chat schema initialized successfully (6 tables)")
	return nil
}
