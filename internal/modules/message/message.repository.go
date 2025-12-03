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
	query := `INSERT INTO messages_by_conversation
	          (conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, reply_to_id)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	return r.session.Query(query,
		msg.ConversationID, msg.MessageID, msg.SenderID, msg.MessageType,
		msg.Content, msg.Metadata, msg.Status, msg.CreatedAt, msg.UpdatedAt, msg.ReplyToID,
	).Exec()
}

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

func (r *Repository) DeleteMessage(conversationID uuid.UUID, messageID gocql.UUID) error {
	now := time.Now()
	query := `UPDATE messages_by_conversation SET deleted_at = ?, updated_at = ? WHERE conversation_id = ? AND message_id = ?`
	return r.session.Query(query, now, now, conversationID, messageID).Exec()
}

func (r *Repository) UpdateConversationLastMessage(userID uuid.UUID, oldLastMessageAt gocql.UUID, conversationID uuid.UUID, newEntry *ConversationInboxUpdate) error {
	deleteQuery := `DELETE FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	if err := r.session.Query(deleteQuery, userID, oldLastMessageAt, conversationID).Exec(); err != nil {
		return fmt.Errorf("failed to delete old entry: %w", err)
	}

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
