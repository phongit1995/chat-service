package message

import (
	"fmt"
	"time"

	"github.com/gocql/gocql"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Repository struct {
	session         *gocql.Session
	logger          *zap.SugaredLogger
	preparedQueries map[string]*gocql.Query
}

func NewRepository(session *gocql.Session, logger *zap.SugaredLogger) *Repository {
	r := &Repository{
		session:         session,
		logger:          logger.Named("[message_repository]"),
		preparedQueries: make(map[string]*gocql.Query),
	}

	r.preparedQueries["create_message"] = session.Query(`
		INSERT INTO messages_by_conversation
		(conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, reply_to_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)

	r.preparedQueries["get_messages"] = session.Query(`
		SELECT conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, deleted_at, reply_to_id
		FROM messages_by_conversation
		WHERE conversation_id = ?
		LIMIT ?
	`)

	r.preparedQueries["get_messages_before"] = session.Query(`
		SELECT conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, deleted_at, reply_to_id
		FROM messages_by_conversation
		WHERE conversation_id = ? AND message_id < ?
		LIMIT ?
	`)

	r.preparedQueries["get_message_by_id"] = session.Query(`
		SELECT conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, deleted_at, reply_to_id
		FROM messages_by_conversation
		WHERE conversation_id = ? AND message_id = ?
	`)

	r.preparedQueries["delete_message"] = session.Query(`
		UPDATE messages_by_conversation SET deleted_at = ?, updated_at = ? WHERE conversation_id = ? AND message_id = ?
	`)

	r.preparedQueries["lookup_conversation"] = session.Query(`
		SELECT last_message_at FROM conversation_user_lookup
		WHERE user_id = ? AND conversation_id = ?
	`)

	r.preparedQueries["get_inbox_entry"] = session.Query(`
		SELECT user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
		       title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at
		FROM conversations_by_user
		WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?
	`)

	return r
}

type Message struct {
	ConversationID uuid.UUID
	MessageID      gocql.UUID
	SenderID       uuid.UUID
	MessageType    string
	Content        string
	Metadata       string
	Status         string
	CreatedAt      time.Time
	UpdatedAt      time.Time
	DeletedAt      *time.Time
	ReplyToID      *uuid.UUID
}

func (r *Repository) CreateMessage(msg *Message) error {
	return r.preparedQueries["create_message"].Bind(
		msg.ConversationID, msg.MessageID, msg.SenderID, msg.MessageType,
		msg.Content, msg.Metadata, msg.Status, msg.CreatedAt, msg.UpdatedAt, msg.ReplyToID,
	).Exec()
}

func (r *Repository) GetMessages(conversationID uuid.UUID, limit int, beforeMessageID *gocql.UUID) ([]Message, error) {
	var messages []Message
	var iter *gocql.Iter

	if beforeMessageID != nil {
		iter = r.preparedQueries["get_messages_before"].Bind(conversationID, *beforeMessageID, limit).Iter()
	} else {
		iter = r.preparedQueries["get_messages"].Bind(conversationID, limit).Iter()
	}

	var msg Message
	for iter.Scan(&msg.ConversationID, &msg.MessageID, &msg.SenderID, &msg.MessageType,
		&msg.Content, &msg.Metadata, &msg.Status, &msg.CreatedAt, &msg.UpdatedAt, &msg.DeletedAt, &msg.ReplyToID) {
		messages = append(messages, msg)
	}

	if err := iter.Close(); err != nil {
		return nil, err
	}

	return messages, nil
}

func (r *Repository) GetMessageByID(conversationID uuid.UUID, messageID gocql.UUID) (*Message, error) {
	var msg Message
	err := r.preparedQueries["get_message_by_id"].Bind(conversationID, messageID).Scan(
		&msg.ConversationID, &msg.MessageID, &msg.SenderID, &msg.MessageType,
		&msg.Content, &msg.Metadata, &msg.Status, &msg.CreatedAt, &msg.UpdatedAt, &msg.DeletedAt, &msg.ReplyToID,
	)
	if err != nil {
		return nil, err
	}
	return &msg, nil
}

func (r *Repository) DeleteMessage(conversationID uuid.UUID, messageID gocql.UUID) error {
	now := time.Now()
	return r.preparedQueries["delete_message"].Bind(now, now, conversationID, messageID).Exec()
}

func (r *Repository) UpdateConversationLastMessage(userID uuid.UUID, oldLastMessageAt gocql.UUID, conversationID uuid.UUID, newEntry *ConversationInboxUpdate) error {
	batch := r.session.NewBatch(gocql.UnloggedBatch)

	deleteQuery := `DELETE FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	batch.Query(deleteQuery, userID, oldLastMessageAt, conversationID)

	insertQuery := `INSERT INTO conversations_by_user
	                (user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	                 title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at)
	                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(insertQuery,
		newEntry.UserID, newEntry.LastMessageAt, newEntry.ConversationID, newEntry.IsGroup,
		newEntry.OtherUserID, newEntry.OtherUserName, newEntry.OtherUserAvatar,
		newEntry.Title, newEntry.Avatar, newEntry.LastMessageID, newEntry.LastMessageBody,
		newEntry.LastMessageSender, newEntry.UnreadCount, newEntry.LastReadMessageID, newEntry.LastReadAt,
	)

	lookupQuery := `INSERT INTO conversation_user_lookup (user_id, conversation_id, last_message_at) VALUES (?, ?, ?)`
	batch.Query(lookupQuery, userID, conversationID, newEntry.LastMessageAt)

	if err := r.session.ExecuteBatch(batch); err != nil {
		return fmt.Errorf("failed to update conversation: %w", err)
	}

	return nil
}

type ConversationInboxUpdate struct {
	UserID            uuid.UUID
	LastMessageAt     gocql.UUID
	ConversationID    uuid.UUID
	IsGroup           bool
	OtherUserID       *uuid.UUID
	OtherUserName     string
	OtherUserAvatar   string
	Title             string
	Avatar            string
	LastMessageID     *gocql.UUID
	LastMessageBody   string
	LastMessageSender *uuid.UUID
	UnreadCount       int
	LastReadMessageID *gocql.UUID
	LastReadAt        *time.Time
}

func (r *Repository) GetConversationInboxEntry(userID, conversationID uuid.UUID) (*ConversationInboxUpdate, *gocql.UUID, error) {
	var entry ConversationInboxUpdate
	var oldLastMessageAt gocql.UUID

	err := r.preparedQueries["lookup_conversation"].Bind(userID, conversationID).Scan(&oldLastMessageAt)
	if err != nil {
		if err == gocql.ErrNotFound {
			return nil, nil, nil
		}
		return nil, nil, fmt.Errorf("lookup query failed: %w", err)
	}

	err = r.preparedQueries["get_inbox_entry"].Bind(userID, oldLastMessageAt, conversationID).Scan(
		&entry.UserID, &oldLastMessageAt, &entry.ConversationID, &entry.IsGroup, &entry.OtherUserID, &entry.OtherUserName, &entry.OtherUserAvatar,
		&entry.Title, &entry.Avatar, &entry.LastMessageID, &entry.LastMessageBody, &entry.LastMessageSender, &entry.UnreadCount, &entry.LastReadMessageID, &entry.LastReadAt,
	)

	if err != nil {
		if err == gocql.ErrNotFound {
			return nil, nil, nil
		}
		return nil, nil, err
	}

	entry.LastMessageAt = oldLastMessageAt
	return &entry, &oldLastMessageAt, nil
}

func (r *Repository) NewBatch() *gocql.Batch {
	return r.session.NewBatch(gocql.LoggedBatch)
}

func (r *Repository) ExecuteBatch(batch *gocql.Batch) error {
	return r.session.ExecuteBatch(batch)
}

func (r *Repository) AddMessageToBatch(batch *gocql.Batch, msg *Message) {
	query := `INSERT INTO messages_by_conversation
	          (conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, reply_to_id)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(query,
		msg.ConversationID, msg.MessageID, msg.SenderID, msg.MessageType,
		msg.Content, msg.Metadata, msg.Status, msg.CreatedAt, msg.UpdatedAt, msg.ReplyToID,
	)
}

func (r *Repository) DeleteFromInboxBatch(batch *gocql.Batch, userID uuid.UUID, oldLastMessageAt gocql.UUID, conversationID uuid.UUID) {
	query := `DELETE FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	batch.Query(query, userID, oldLastMessageAt, conversationID)
}

func (r *Repository) AddToInboxBatch(batch *gocql.Batch, entry *ConversationInboxUpdate) {
	query := `INSERT INTO conversations_by_user
	          (user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	           title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(query,
		entry.UserID, entry.LastMessageAt, entry.ConversationID, entry.IsGroup,
		entry.OtherUserID, entry.OtherUserName, entry.OtherUserAvatar,
		entry.Title, entry.Avatar, entry.LastMessageID, entry.LastMessageBody,
		entry.LastMessageSender, entry.UnreadCount, entry.LastReadMessageID, entry.LastReadAt,
	)
}
