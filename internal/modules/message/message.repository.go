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
	gocqlConvID, err := gocql.ParseUUID(msg.ConversationID.String())
	if err != nil {
		return fmt.Errorf("invalid conversation ID: %w", err)
	}
	gocqlSenderID, err := gocql.ParseUUID(msg.SenderID.String())
	if err != nil {
		return fmt.Errorf("invalid sender ID: %w", err)
	}

	var gocqlReplyToID *gocql.UUID
	if msg.ReplyToID != nil {
		gocqlReply, err := gocql.ParseUUID(msg.ReplyToID.String())
		if err != nil {
			return fmt.Errorf("invalid reply to ID: %w", err)
		}
		gocqlReplyToID = &gocqlReply
	}

	return r.preparedQueries["create_message"].Bind(
		gocqlConvID, msg.MessageID, gocqlSenderID, msg.MessageType,
		msg.Content, msg.Metadata, msg.Status, msg.CreatedAt, msg.UpdatedAt, gocqlReplyToID,
	).Exec()
}

func (r *Repository) GetMessages(conversationID uuid.UUID, limit int, beforeMessageID *gocql.UUID) ([]Message, error) {
	gocqlConvID, err := gocql.ParseUUID(conversationID.String())
	if err != nil {
		return nil, fmt.Errorf("invalid conversation ID: %w", err)
	}

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
		convID, err := uuid.Parse(gocqlMsg.ConversationID.String())
		if err != nil {
			r.logger.Warnw("Invalid conversation ID in message", "error", err)
			continue
		}
		senderID, err := uuid.Parse(gocqlMsg.SenderID.String())
		if err != nil {
			r.logger.Warnw("Invalid sender ID in message", "error", err)
			continue
		}

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
			replyToID, err := uuid.Parse(gocqlMsg.ReplyToID.String())
			if err != nil {
				r.logger.Warnw("Invalid reply to ID in message", "error", err)
			} else {
				msg.ReplyToID = &replyToID
			}
		}

		messages = append(messages, msg)
	}

	if err := iter.Close(); err != nil {
		return nil, err
	}

	return messages, nil
}

func (r *Repository) GetMessageByID(conversationID uuid.UUID, messageID gocql.UUID) (*Message, error) {
	gocqlConvID, err := gocql.ParseUUID(conversationID.String())
	if err != nil {
		return nil, fmt.Errorf("invalid conversation ID: %w", err)
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

	err = r.preparedQueries["get_message_by_id"].Bind(gocqlConvID, messageID).Scan(
		&gocqlMsg.ConversationID, &gocqlMsg.MessageID, &gocqlMsg.SenderID, &gocqlMsg.MessageType,
		&gocqlMsg.Content, &gocqlMsg.Metadata, &gocqlMsg.Status, &gocqlMsg.CreatedAt, &gocqlMsg.UpdatedAt,
		&gocqlMsg.DeletedAt, &gocqlMsg.ReplyToID,
	)
	if err != nil {
		return nil, err
	}

	convID, err := uuid.Parse(gocqlMsg.ConversationID.String())
	if err != nil {
		return nil, fmt.Errorf("invalid conversation ID in result: %w", err)
	}
	senderID, err := uuid.Parse(gocqlMsg.SenderID.String())
	if err != nil {
		return nil, fmt.Errorf("invalid sender ID in result: %w", err)
	}

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
		replyToID, err := uuid.Parse(gocqlMsg.ReplyToID.String())
		if err != nil {
			return nil, fmt.Errorf("invalid reply to ID in result: %w", err)
		}
		msg.ReplyToID = &replyToID
	}

	return msg, nil
}

func (r *Repository) UpdateMessage(conversationID uuid.UUID, messageID gocql.UUID, newContent string) error {
	gocqlConvID, err := gocql.ParseUUID(conversationID.String())
	if err != nil {
		return fmt.Errorf("invalid conversation ID: %w", err)
	}
	now := time.Now()
	return r.preparedQueries["update_message"].Bind(newContent, now, gocqlConvID, messageID).Exec()
}

func (r *Repository) DeleteMessage(conversationID uuid.UUID, messageID gocql.UUID) error {
	gocqlConvID, err := gocql.ParseUUID(conversationID.String())
	if err != nil {
		return fmt.Errorf("invalid conversation ID: %w", err)
	}
	now := time.Now()
	return r.preparedQueries["delete_message"].Bind(now, now, gocqlConvID, messageID).Exec()
}

func (r *Repository) UpdateConversationLastMessage(userID uuid.UUID, oldLastMessageAt gocql.UUID, conversationID uuid.UUID, newEntry *ConversationInboxUpdate) error {
	batch := r.session.NewBatch(gocql.UnloggedBatch)

	gocqlUserID, err := gocql.ParseUUID(userID.String())
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}
	gocqlConvID, err := gocql.ParseUUID(conversationID.String())
	if err != nil {
		return fmt.Errorf("invalid conversation ID: %w", err)
	}

	deleteQuery := `DELETE FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	batch.Query(deleteQuery, gocqlUserID, oldLastMessageAt, gocqlConvID)

	gocqlNewUserID, err := gocql.ParseUUID(newEntry.UserID.String())
	if err != nil {
		return fmt.Errorf("invalid new entry user ID: %w", err)
	}
	gocqlNewConvID, err := gocql.ParseUUID(newEntry.ConversationID.String())
	if err != nil {
		return fmt.Errorf("invalid new entry conversation ID: %w", err)
	}

	var gocqlNewOtherUserID *gocql.UUID
	if newEntry.OtherUserID != nil {
		gocqlOther, err := gocql.ParseUUID(newEntry.OtherUserID.String())
		if err != nil {
			return fmt.Errorf("invalid other user ID: %w", err)
		}
		gocqlNewOtherUserID = &gocqlOther
	}

	var gocqlNewLastMessageSender *gocql.UUID
	if newEntry.LastMessageSender != nil {
		gocqlSender, err := gocql.ParseUUID(newEntry.LastMessageSender.String())
		if err != nil {
			return fmt.Errorf("invalid last message sender ID: %w", err)
		}
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

	time.Sleep(50 * time.Millisecond)

	verifyQuery := `SELECT conversation_id FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	var verifyConvID gocql.UUID
	err = r.session.Query(verifyQuery, gocqlUserID, newEntry.LastMessageAt, gocqlConvID).Scan(&verifyConvID)
	if err != nil {
		if err == gocql.ErrNotFound {
			r.logger.Errorw("CRITICAL: Entry not found after INSERT",
				"user_id", userID,
				"conversation_id", conversationID,
				"last_message_at", newEntry.LastMessageAt.Time(),
			)
			return fmt.Errorf("entry verification failed: entry not found after insert")
		}
		r.logger.Warnw("Entry verification query failed", "error", err)
	} else {
		r.logger.Debugw("Entry verified after INSERT",
			"user_id", userID,
			"conversation_id", conversationID,
			"last_message_at", newEntry.LastMessageAt.Time(),
		)
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
	gocqlUserID, err := gocql.ParseUUID(userID.String())
	if err != nil {
		return nil, nil, fmt.Errorf("invalid user ID: %w", err)
	}
	gocqlConvID, err := gocql.ParseUUID(conversationID.String())
	if err != nil {
		return nil, nil, fmt.Errorf("invalid conversation ID: %w", err)
	}

	var oldLastMessageAt gocql.UUID

	err = r.preparedQueries["lookup_conversation"].Bind(gocqlUserID, gocqlConvID).Scan(&oldLastMessageAt)
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
			r.logger.Warnw("Lookup pointed to non-existent entry, scanning all entries for this conversation",
				"user_id", userID,
				"conversation_id", conversationID,
				"lookup_last_message_at", oldLastMessageAt.Time(),
			)

			return r.fallbackScanForConversation(userID, conversationID, gocqlUserID, gocqlConvID)
		}
		return nil, nil, err
	}

	resultUserID, err := uuid.Parse(gocqlEntry.UserID.String())
	if err != nil {
		return nil, nil, fmt.Errorf("invalid user ID in result: %w", err)
	}
	resultConvID, err := uuid.Parse(gocqlEntry.ConversationID.String())
	if err != nil {
		return nil, nil, fmt.Errorf("invalid conversation ID in result: %w", err)
	}

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

	if gocqlEntry.OtherUserID != nil {
		otherUserID, err := uuid.Parse(gocqlEntry.OtherUserID.String())
		if err != nil {
			return nil, nil, fmt.Errorf("invalid other user ID in result: %w", err)
		}
		entry.OtherUserID = &otherUserID
	}

	if gocqlEntry.LastMessageSender != nil {
		lastMessageSender, err := uuid.Parse(gocqlEntry.LastMessageSender.String())
		if err != nil {
			return nil, nil, fmt.Errorf("invalid last message sender ID in result: %w", err)
		}
		entry.LastMessageSender = &lastMessageSender
	}

	return entry, &oldLastMessageAt, nil
}

func (r *Repository) fallbackScanForConversation(userID, conversationID uuid.UUID, gocqlUserID, gocqlConvID gocql.UUID) (*ConversationInboxUpdate, *gocql.UUID, error) {
	query := `SELECT user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	                 title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at
	          FROM conversations_by_user WHERE user_id = ? AND conversation_id = ? ALLOW FILTERING`

	iter := r.session.Query(query, gocqlUserID, gocqlConvID).Iter()

	var latestEntry *ConversationInboxUpdate
	var latestLastMessageAt gocql.UUID
	var latestTime time.Time

	var gocqlEntry struct {
		UserID            gocql.UUID
		LastMessageAt     gocql.UUID
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

	for iter.Scan(&gocqlEntry.UserID, &gocqlEntry.LastMessageAt, &gocqlEntry.ConversationID, &gocqlEntry.IsGroup,
		&gocqlEntry.OtherUserID, &gocqlEntry.OtherUserName, &gocqlEntry.OtherUserAvatar,
		&gocqlEntry.Title, &gocqlEntry.Avatar, &gocqlEntry.LastMessageID, &gocqlEntry.LastMessageBody,
		&gocqlEntry.LastMessageSender, &gocqlEntry.UnreadCount, &gocqlEntry.LastReadMessageID, &gocqlEntry.LastReadAt) {

		entryTime := gocqlEntry.LastMessageAt.Time()
		if latestEntry == nil || entryTime.After(latestTime) {
			resultUserID, _ := uuid.Parse(gocqlEntry.UserID.String())
			resultConvID, _ := uuid.Parse(gocqlEntry.ConversationID.String())

			entry := &ConversationInboxUpdate{
				UserID:            resultUserID,
				LastMessageAt:     gocqlEntry.LastMessageAt,
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

			if gocqlEntry.OtherUserID != nil {
				otherUserID, _ := uuid.Parse(gocqlEntry.OtherUserID.String())
				entry.OtherUserID = &otherUserID
			}

			if gocqlEntry.LastMessageSender != nil {
				lastMessageSender, _ := uuid.Parse(gocqlEntry.LastMessageSender.String())
				entry.LastMessageSender = &lastMessageSender
			}

			latestEntry = entry
			latestLastMessageAt = gocqlEntry.LastMessageAt
			latestTime = entryTime
		}
	}

	if err := iter.Close(); err != nil {
		return nil, nil, fmt.Errorf("fallback scan failed: %w", err)
	}

	if latestEntry != nil {
		r.logger.Infow("Fallback scan found conversation entry",
			"user_id", userID,
			"conversation_id", conversationID,
			"last_message_at", latestTime,
		)

		lookupUpdateQuery := `INSERT INTO conversation_user_lookup (user_id, conversation_id, last_message_at) VALUES (?, ?, ?)`
		if err := r.session.Query(lookupUpdateQuery, gocqlUserID, gocqlConvID, latestLastMessageAt).Exec(); err != nil {
			r.logger.Warnw("Failed to update lookup table after fallback", "error", err)
		}
	}

	return latestEntry, &latestLastMessageAt, nil
}

func (r *Repository) NewBatch() *gocql.Batch {
	return r.session.NewBatch(gocql.LoggedBatch)
}

func (r *Repository) ExecuteBatch(batch *gocql.Batch) error {
	return r.session.ExecuteBatch(batch)
}

func (r *Repository) AddMessageToBatch(batch *gocql.Batch, msg *Message) error {
	gocqlConvID, err := gocql.ParseUUID(msg.ConversationID.String())
	if err != nil {
		return fmt.Errorf("invalid conversation ID: %w", err)
	}
	gocqlSenderID, err := gocql.ParseUUID(msg.SenderID.String())
	if err != nil {
		return fmt.Errorf("invalid sender ID: %w", err)
	}

	var gocqlReplyToID *gocql.UUID
	if msg.ReplyToID != nil {
		gocqlReply, err := gocql.ParseUUID(msg.ReplyToID.String())
		if err != nil {
			return fmt.Errorf("invalid reply to ID: %w", err)
		}
		gocqlReplyToID = &gocqlReply
	}

	query := `INSERT INTO messages_by_conversation
	          (conversation_id, message_id, sender_id, message_type, content, metadata, status, created_at, updated_at, reply_to_id)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(query,
		gocqlConvID, msg.MessageID, gocqlSenderID, msg.MessageType,
		msg.Content, msg.Metadata, msg.Status, msg.CreatedAt, msg.UpdatedAt, gocqlReplyToID,
	)
	return nil
}

func (r *Repository) DeleteFromInboxBatch(batch *gocql.Batch, userID uuid.UUID, oldLastMessageAt gocql.UUID, conversationID uuid.UUID) {
	query := `DELETE FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	batch.Query(query, userID, oldLastMessageAt, conversationID)
}

func (r *Repository) AddToInboxBatch(batch *gocql.Batch, entry *ConversationInboxUpdate) error {
	gocqlUserID, err := gocql.ParseUUID(entry.UserID.String())
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}
	gocqlConvID, err := gocql.ParseUUID(entry.ConversationID.String())
	if err != nil {
		return fmt.Errorf("invalid conversation ID: %w", err)
	}

	var gocqlOtherUserID *gocql.UUID
	if entry.OtherUserID != nil {
		gocqlOther, err := gocql.ParseUUID(entry.OtherUserID.String())
		if err != nil {
			return fmt.Errorf("invalid other user ID: %w", err)
		}
		gocqlOtherUserID = &gocqlOther
	}

	var gocqlLastMessageSender *gocql.UUID
	if entry.LastMessageSender != nil {
		gocqlSender, err := gocql.ParseUUID(entry.LastMessageSender.String())
		if err != nil {
			return fmt.Errorf("invalid last message sender ID: %w", err)
		}
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
	return nil
}
