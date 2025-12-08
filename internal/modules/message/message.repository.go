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

	r.preparedQueries["update_message"] = session.Query(`
		UPDATE messages_by_conversation SET content = ?, updated_at = ? WHERE conversation_id = ? AND message_id = ?
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
	gocqlConvID, _ := gocql.ParseUUID(msg.ConversationID.String())
	gocqlSenderID, _ := gocql.ParseUUID(msg.SenderID.String())

	var gocqlReplyToID *gocql.UUID
	if msg.ReplyToID != nil {
		gocqlReply, _ := gocql.ParseUUID(msg.ReplyToID.String())
		gocqlReplyToID = &gocqlReply
	}

	return r.preparedQueries["create_message"].Bind(
		gocqlConvID, msg.MessageID, gocqlSenderID, msg.MessageType,
		msg.Content, msg.Metadata, msg.Status, msg.CreatedAt, msg.UpdatedAt, gocqlReplyToID,
	).Exec()
}

func (r *Repository) GetMessages(conversationID uuid.UUID, limit int, beforeMessageID *gocql.UUID) ([]Message, error) {
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	var messages []Message
	var iter *gocql.Iter

	if beforeMessageID != nil {
		iter = r.preparedQueries["get_messages_before"].Bind(gocqlConvID, *beforeMessageID, limit).Iter()
	} else {
		iter = r.preparedQueries["get_messages"].Bind(gocqlConvID, limit).Iter()
	}

	var gocqlMsg struct {
		ConversationID gocql.UUID
		MessageID      gocql.UUID
		SenderID       gocql.UUID
		MessageType    string
		Content        string
		Metadata       string
		Status         string
		CreatedAt      time.Time
		UpdatedAt      time.Time
		DeletedAt      *time.Time
		ReplyToID      *gocql.UUID
	}

	for iter.Scan(&gocqlMsg.ConversationID, &gocqlMsg.MessageID, &gocqlMsg.SenderID, &gocqlMsg.MessageType,
		&gocqlMsg.Content, &gocqlMsg.Metadata, &gocqlMsg.Status, &gocqlMsg.CreatedAt, &gocqlMsg.UpdatedAt,
		&gocqlMsg.DeletedAt, &gocqlMsg.ReplyToID) {

		// Convert gocql.UUID to uuid.UUID
		convID, _ := uuid.Parse(gocqlMsg.ConversationID.String())
		senderID, _ := uuid.Parse(gocqlMsg.SenderID.String())

		msg := Message{
			ConversationID: convID,
			MessageID:      gocqlMsg.MessageID,
			SenderID:       senderID,
			MessageType:    gocqlMsg.MessageType,
			Content:        gocqlMsg.Content,
			Metadata:       gocqlMsg.Metadata,
			Status:         gocqlMsg.Status,
			CreatedAt:      gocqlMsg.CreatedAt,
			UpdatedAt:      gocqlMsg.UpdatedAt,
			DeletedAt:      gocqlMsg.DeletedAt,
		}

		if gocqlMsg.ReplyToID != nil {
			replyToID, _ := uuid.Parse(gocqlMsg.ReplyToID.String())
			msg.ReplyToID = &replyToID
		}

		messages = append(messages, msg)
	}

	if err := iter.Close(); err != nil {
		return nil, err
	}

	return messages, nil
}

func (r *Repository) GetMessageByID(conversationID uuid.UUID, messageID gocql.UUID) (*Message, error) {
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	var gocqlMsg struct {
		ConversationID gocql.UUID
		MessageID      gocql.UUID
		SenderID       gocql.UUID
		MessageType    string
		Content        string
		Metadata       string
		Status         string
		CreatedAt      time.Time
		UpdatedAt      time.Time
		DeletedAt      *time.Time
		ReplyToID      *gocql.UUID
	}

	err := r.preparedQueries["get_message_by_id"].Bind(gocqlConvID, messageID).Scan(
		&gocqlMsg.ConversationID, &gocqlMsg.MessageID, &gocqlMsg.SenderID, &gocqlMsg.MessageType,
		&gocqlMsg.Content, &gocqlMsg.Metadata, &gocqlMsg.Status, &gocqlMsg.CreatedAt, &gocqlMsg.UpdatedAt,
		&gocqlMsg.DeletedAt, &gocqlMsg.ReplyToID,
	)
	if err != nil {
		return nil, err
	}

	// Convert gocql.UUID to uuid.UUID
	convID, _ := uuid.Parse(gocqlMsg.ConversationID.String())
	senderID, _ := uuid.Parse(gocqlMsg.SenderID.String())

	msg := &Message{
		ConversationID: convID,
		MessageID:      gocqlMsg.MessageID,
		SenderID:       senderID,
		MessageType:    gocqlMsg.MessageType,
		Content:        gocqlMsg.Content,
		Metadata:       gocqlMsg.Metadata,
		Status:         gocqlMsg.Status,
		CreatedAt:      gocqlMsg.CreatedAt,
		UpdatedAt:      gocqlMsg.UpdatedAt,
		DeletedAt:      gocqlMsg.DeletedAt,
	}

	if gocqlMsg.ReplyToID != nil {
		replyToID, _ := uuid.Parse(gocqlMsg.ReplyToID.String())
		msg.ReplyToID = &replyToID
	}

	return msg, nil
}

func (r *Repository) UpdateMessage(conversationID uuid.UUID, messageID gocql.UUID, newContent string) error {
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())
	now := time.Now()
	return r.preparedQueries["update_message"].Bind(newContent, now, gocqlConvID, messageID).Exec()
}

func (r *Repository) DeleteMessage(conversationID uuid.UUID, messageID gocql.UUID) error {
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())
	now := time.Now()
	return r.preparedQueries["delete_message"].Bind(now, now, gocqlConvID, messageID).Exec()
}

func (r *Repository) UpdateConversationLastMessage(userID uuid.UUID, oldLastMessageAt gocql.UUID, conversationID uuid.UUID, newEntry *ConversationInboxUpdate) error {
	batch := r.session.NewBatch(gocql.UnloggedBatch)

	gocqlUserID, _ := gocql.ParseUUID(userID.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	deleteQuery := `DELETE FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	batch.Query(deleteQuery, gocqlUserID, oldLastMessageAt, gocqlConvID)

	// Convert uuid.UUID to gocql.UUID for newEntry
	gocqlNewUserID, _ := gocql.ParseUUID(newEntry.UserID.String())
	gocqlNewConvID, _ := gocql.ParseUUID(newEntry.ConversationID.String())

	var gocqlNewOtherUserID *gocql.UUID
	if newEntry.OtherUserID != nil {
		gocqlOther, _ := gocql.ParseUUID(newEntry.OtherUserID.String())
		gocqlNewOtherUserID = &gocqlOther
	}

	var gocqlNewLastMessageSender *gocql.UUID
	if newEntry.LastMessageSender != nil {
		gocqlSender, _ := gocql.ParseUUID(newEntry.LastMessageSender.String())
		gocqlNewLastMessageSender = &gocqlSender
	}

	insertQuery := `INSERT INTO conversations_by_user
	                (user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	                 title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at)
	                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(insertQuery,
		gocqlNewUserID, newEntry.LastMessageAt, gocqlNewConvID, newEntry.IsGroup,
		gocqlNewOtherUserID, newEntry.OtherUserName, newEntry.OtherUserAvatar,
		newEntry.Title, newEntry.Avatar, newEntry.LastMessageID, newEntry.LastMessageBody,
		gocqlNewLastMessageSender, newEntry.UnreadCount, newEntry.LastReadMessageID, newEntry.LastReadAt,
	)

	lookupQuery := `INSERT INTO conversation_user_lookup (user_id, conversation_id, last_message_at) VALUES (?, ?, ?)`
	batch.Query(lookupQuery, gocqlUserID, gocqlConvID, newEntry.LastMessageAt)

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
	gocqlUserID, _ := gocql.ParseUUID(userID.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	var oldLastMessageAt gocql.UUID

	err := r.preparedQueries["lookup_conversation"].Bind(gocqlUserID, gocqlConvID).Scan(&oldLastMessageAt)
	if err != nil {
		if err == gocql.ErrNotFound {
			return nil, nil, nil
		}
		return nil, nil, fmt.Errorf("lookup query failed: %w", err)
	}

	var gocqlEntry struct {
		UserID            gocql.UUID
		ConversationID    gocql.UUID
		IsGroup           bool
		OtherUserID       *gocql.UUID
		OtherUserName     string
		OtherUserAvatar   string
		Title             string
		Avatar            string
		LastMessageID     *gocql.UUID
		LastMessageBody   string
		LastMessageSender *gocql.UUID
		UnreadCount       int
		LastReadMessageID *gocql.UUID
		LastReadAt        *time.Time
	}

	err = r.preparedQueries["get_inbox_entry"].Bind(gocqlUserID, oldLastMessageAt, gocqlConvID).Scan(
		&gocqlEntry.UserID, &oldLastMessageAt, &gocqlEntry.ConversationID, &gocqlEntry.IsGroup,
		&gocqlEntry.OtherUserID, &gocqlEntry.OtherUserName, &gocqlEntry.OtherUserAvatar,
		&gocqlEntry.Title, &gocqlEntry.Avatar, &gocqlEntry.LastMessageID, &gocqlEntry.LastMessageBody,
		&gocqlEntry.LastMessageSender, &gocqlEntry.UnreadCount, &gocqlEntry.LastReadMessageID, &gocqlEntry.LastReadAt,
	)

	if err != nil {
		if err == gocql.ErrNotFound {
			return nil, nil, nil
		}
		return nil, nil, err
	}

	// Convert gocql.UUID to uuid.UUID
	resultUserID, _ := uuid.Parse(gocqlEntry.UserID.String())
	resultConvID, _ := uuid.Parse(gocqlEntry.ConversationID.String())

	entry := &ConversationInboxUpdate{
		UserID:            resultUserID,
		LastMessageAt:     oldLastMessageAt,
		ConversationID:    resultConvID,
		IsGroup:           gocqlEntry.IsGroup,
		OtherUserName:     gocqlEntry.OtherUserName,
		OtherUserAvatar:   gocqlEntry.OtherUserAvatar,
		Title:             gocqlEntry.Title,
		Avatar:            gocqlEntry.Avatar,
		LastMessageID:     gocqlEntry.LastMessageID,
		LastMessageBody:   gocqlEntry.LastMessageBody,
		UnreadCount:       gocqlEntry.UnreadCount,
		LastReadMessageID: gocqlEntry.LastReadMessageID,
		LastReadAt:        gocqlEntry.LastReadAt,
	}

	// Convert pointer UUIDs
	if gocqlEntry.OtherUserID != nil {
		otherUserID, _ := uuid.Parse(gocqlEntry.OtherUserID.String())
		entry.OtherUserID = &otherUserID
	}

	if gocqlEntry.LastMessageSender != nil {
		lastMessageSender, _ := uuid.Parse(gocqlEntry.LastMessageSender.String())
		entry.LastMessageSender = &lastMessageSender
	}

	return entry, &oldLastMessageAt, nil
}

func (r *Repository) NewBatch() *gocql.Batch {
	return r.session.NewBatch(gocql.LoggedBatch)
}

func (r *Repository) ExecuteBatch(batch *gocql.Batch) error {
	return r.session.ExecuteBatch(batch)
}

func (r *Repository) AddMessageToBatch(batch *gocql.Batch, msg *Message) {
	gocqlConvID, _ := gocql.ParseUUID(msg.ConversationID.String())
	gocqlSenderID, _ := gocql.ParseUUID(msg.SenderID.String())

	var gocqlReplyToID *gocql.UUID
	if msg.ReplyToID != nil {
		gocqlReply, _ := gocql.ParseUUID(msg.ReplyToID.String())
		gocqlReplyToID = &gocqlReply
	}

	query := `INSERT INTO messages_by_conversation
	          (conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, reply_to_id)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(query,
		gocqlConvID, msg.MessageID, gocqlSenderID, msg.MessageType,
		msg.Content, msg.Metadata, msg.Status, msg.CreatedAt, msg.UpdatedAt, gocqlReplyToID,
	)
}

func (r *Repository) DeleteFromInboxBatch(batch *gocql.Batch, userID uuid.UUID, oldLastMessageAt gocql.UUID, conversationID uuid.UUID) {
	query := `DELETE FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	batch.Query(query, userID, oldLastMessageAt, conversationID)
}

func (r *Repository) AddToInboxBatch(batch *gocql.Batch, entry *ConversationInboxUpdate) {
	// Convert uuid.UUID to gocql.UUID
	gocqlUserID, _ := gocql.ParseUUID(entry.UserID.String())
	gocqlConvID, _ := gocql.ParseUUID(entry.ConversationID.String())

	var gocqlOtherUserID *gocql.UUID
	if entry.OtherUserID != nil {
		gocqlOther, _ := gocql.ParseUUID(entry.OtherUserID.String())
		gocqlOtherUserID = &gocqlOther
	}

	var gocqlLastMessageSender *gocql.UUID
	if entry.LastMessageSender != nil {
		gocqlSender, _ := gocql.ParseUUID(entry.LastMessageSender.String())
		gocqlLastMessageSender = &gocqlSender
	}

	query := `INSERT INTO conversations_by_user
	          (user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	           title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(query,
		gocqlUserID, entry.LastMessageAt, gocqlConvID, entry.IsGroup,
		gocqlOtherUserID, entry.OtherUserName, entry.OtherUserAvatar,
		entry.Title, entry.Avatar, entry.LastMessageID, entry.LastMessageBody,
		gocqlLastMessageSender, entry.UnreadCount, entry.LastReadMessageID, entry.LastReadAt,
	)
}
