package message

import (
	"fmt"
	"time"

	"github.com/gocql/gocql"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Repository struct {
	session *gocql.Session
	logger  *zap.SugaredLogger
}

func NewRepository(session *gocql.Session, logger *zap.SugaredLogger) *Repository {
	return &Repository{
		session: session,
		logger:  logger.Named("[message_repository]"),
	}
}

type Message struct {
	ConversationID uuid.UUID
	MessageID      gocql.UUID // timeuuid
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

// CreateMessage inserts a new message
func (r *Repository) CreateMessage(msg *Message) error {
	query := `INSERT INTO messages_by_conversation
	          (conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, reply_to_id)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	return r.session.Query(query,
		msg.ConversationID, msg.MessageID, msg.SenderID, msg.MessageType,
		msg.Content, msg.Metadata, msg.Status, msg.CreatedAt, msg.UpdatedAt, msg.ReplyToID,
	).Exec()
}

// GetMessages retrieves messages from a conversation with pagination
func (r *Repository) GetMessages(conversationID uuid.UUID, limit int, beforeMessageID *gocql.UUID) ([]Message, error) {
	var messages []Message

	var query string
	var iter *gocql.Iter

	if beforeMessageID != nil {
		query = `SELECT conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, deleted_at, reply_to_id
		         FROM messages_by_conversation
		         WHERE conversation_id = ? AND message_id < ?
		         LIMIT ?`
		iter = r.session.Query(query, conversationID, *beforeMessageID, limit).Iter()
	} else {
		query = `SELECT conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, deleted_at, reply_to_id
		         FROM messages_by_conversation
		         WHERE conversation_id = ?
		         LIMIT ?`
		iter = r.session.Query(query, conversationID, limit).Iter()
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

// GetMessageByID retrieves a specific message by its ID
func (r *Repository) GetMessageByID(conversationID uuid.UUID, messageID gocql.UUID) (*Message, error) {
	var msg Message
	query := `SELECT conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, deleted_at, reply_to_id
	          FROM messages_by_conversation
	          WHERE conversation_id = ? AND message_id = ?`
	err := r.session.Query(query, conversationID, messageID).Scan(
		&msg.ConversationID, &msg.MessageID, &msg.SenderID, &msg.MessageType,
		&msg.Content, &msg.Metadata, &msg.Status, &msg.CreatedAt, &msg.UpdatedAt, &msg.DeletedAt, &msg.ReplyToID,
	)
	if err != nil {
		return nil, err
	}
	return &msg, nil
}

// DeleteMessage performs soft delete by setting deleted_at timestamp
func (r *Repository) DeleteMessage(conversationID uuid.UUID, messageID gocql.UUID) error {
	now := time.Now()
	query := `UPDATE messages_by_conversation SET deleted_at = ?, updated_at = ? WHERE conversation_id = ? AND message_id = ?`
	return r.session.Query(query, now, now, conversationID, messageID).Exec()
}

// UpdateConversationLastMessage updates the last message info in user's inbox
// This function helps maintain denormalized data in conversations_by_user table
func (r *Repository) UpdateConversationLastMessage(userID uuid.UUID, oldLastMessageAt gocql.UUID, conversationID uuid.UUID, newEntry *ConversationInboxUpdate) error {
	// Delete old entry
	deleteQuery := `DELETE FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	if err := r.session.Query(deleteQuery, userID, oldLastMessageAt, conversationID).Exec(); err != nil {
		return fmt.Errorf("failed to delete old entry: %w", err)
	}

	// Insert new entry
	insertQuery := `INSERT INTO conversations_by_user
	                (user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	                 title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at)
	                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	return r.session.Query(insertQuery,
		newEntry.UserID, newEntry.LastMessageAt, newEntry.ConversationID, newEntry.IsGroup,
		newEntry.OtherUserID, newEntry.OtherUserName, newEntry.OtherUserAvatar,
		newEntry.Title, newEntry.Avatar, newEntry.LastMessageID, newEntry.LastMessageBody,
		newEntry.LastMessageSender, newEntry.UnreadCount, newEntry.LastReadMessageID, newEntry.LastReadAt,
	).Exec()
}

// ConversationInboxUpdate represents an update to a user's conversation inbox entry
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

// GetConversationInboxEntry retrieves a user's inbox entry for a specific conversation
func (r *Repository) GetConversationInboxEntry(userID, conversationID uuid.UUID) (*ConversationInboxUpdate, *gocql.UUID, error) {
	var entry ConversationInboxUpdate
	var oldLastMessageAt gocql.UUID

	query := `SELECT user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	                 title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at
	          FROM conversations_by_user WHERE user_id = ? AND conversation_id = ? LIMIT 1 ALLOW FILTERING`

	err := r.session.Query(query, userID, conversationID).Scan(
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
