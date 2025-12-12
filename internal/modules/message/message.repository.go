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
		(conversation_id, message_id, sender_id, sender_name, sender_avatar, message_type, content, metadata, created_at, updated_at, reply_to_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)

	r.preparedQueries["get_messages"] = session.Query(`
		SELECT conversation_id, message_id, sender_id, sender_name, sender_avatar, message_type, content, metadata, created_at, updated_at, deleted_at, reply_to_id
		FROM messages_by_conversation
		WHERE conversation_id = ?
		LIMIT ?
	`)

	r.preparedQueries["get_messages_before"] = session.Query(`
		SELECT conversation_id, message_id, sender_id, sender_name, sender_avatar, message_type, content, metadata, created_at, updated_at, deleted_at, reply_to_id
		FROM messages_by_conversation
		WHERE conversation_id = ? AND message_id < ?
		LIMIT ?
	`)

	r.preparedQueries["get_message_by_id"] = session.Query(`
		SELECT conversation_id, message_id, sender_id, sender_name, sender_avatar, message_type, content, metadata, created_at, updated_at, deleted_at, reply_to_id
		FROM messages_by_conversation
		WHERE conversation_id = ? AND message_id = ?
	`)

	r.preparedQueries["delete_message"] = session.Query(`
		UPDATE messages_by_conversation SET deleted_at = ?, updated_at = ? WHERE conversation_id = ? AND message_id = ?
	`)

	r.preparedQueries["update_message"] = session.Query(`
		UPDATE messages_by_conversation SET content = ?, updated_at = ? WHERE conversation_id = ? AND message_id = ?
	`)

	r.preparedQueries["get_inbox_entry"] = session.Query(`
		SELECT user_id, conversation_id, conversation_type, display_name, display_avatar,
		       other_user_id, other_user_name, other_user_avatar,
		       last_message_at, last_message_id, last_message_preview, last_message_sender,
		       unread_count, last_read_message_id, last_read_at, updated_at
		FROM conversations_by_user
		WHERE user_id = ? AND conversation_id = ?
	`)

	return r
}

type Message struct {
	ConversationID uuid.UUID
	MessageID      gocql.UUID
	SenderID       uuid.UUID
	SenderName     string
	SenderAvatar   string
	MessageType    string
	Content        string
	Metadata       string
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
		gocqlConvID, msg.MessageID, gocqlSenderID, msg.SenderName, msg.SenderAvatar,
		msg.MessageType, msg.Content, msg.Metadata, msg.CreatedAt, msg.UpdatedAt, gocqlReplyToID,
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
		SenderName     string
		SenderAvatar   string
		MessageType    string
		Content        string
		Metadata       string
		CreatedAt      time.Time
		UpdatedAt      time.Time
		DeletedAt      *time.Time
		ReplyToID      *gocql.UUID
	}

	for iter.Scan(&gocqlMsg.ConversationID, &gocqlMsg.MessageID, &gocqlMsg.SenderID, &gocqlMsg.SenderName, &gocqlMsg.SenderAvatar,
		&gocqlMsg.MessageType, &gocqlMsg.Content, &gocqlMsg.Metadata, &gocqlMsg.CreatedAt, &gocqlMsg.UpdatedAt,
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
			SenderName:     gocqlMsg.SenderName,
			SenderAvatar:   gocqlMsg.SenderAvatar,
			MessageType:    gocqlMsg.MessageType,
			Content:        gocqlMsg.Content,
			Metadata:       gocqlMsg.Metadata,
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
		SenderName     string
		SenderAvatar   string
		MessageType    string
		Content        string
		Metadata       string
		CreatedAt      time.Time
		UpdatedAt      time.Time
		DeletedAt      *time.Time
		ReplyToID      *gocql.UUID
	}

	err = r.preparedQueries["get_message_by_id"].Bind(gocqlConvID, messageID).Scan(
		&gocqlMsg.ConversationID, &gocqlMsg.MessageID, &gocqlMsg.SenderID, &gocqlMsg.SenderName, &gocqlMsg.SenderAvatar,
		&gocqlMsg.MessageType, &gocqlMsg.Content, &gocqlMsg.Metadata, &gocqlMsg.CreatedAt, &gocqlMsg.UpdatedAt,
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
		SenderName:     gocqlMsg.SenderName,
		SenderAvatar:   gocqlMsg.SenderAvatar,
		MessageType:    gocqlMsg.MessageType,
		Content:        gocqlMsg.Content,
		Metadata:       gocqlMsg.Metadata,
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
	gocqlUserID, err := gocql.ParseUUID(userID.String())
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}
	gocqlConvID, err := gocql.ParseUUID(conversationID.String())
	if err != nil {
		return fmt.Errorf("invalid conversation ID: %w", err)
	}

	var gocqlOtherUserID *gocql.UUID
	if newEntry.OtherUserID != nil {
		gocqlOther, err := gocql.ParseUUID(newEntry.OtherUserID.String())
		if err != nil {
			return fmt.Errorf("invalid other user ID: %w", err)
		}
		gocqlOtherUserID = &gocqlOther
	}

	var gocqlLastMessageSender *gocql.UUID
	if newEntry.LastMessageSender != nil {
		gocqlSender, err := gocql.ParseUUID(newEntry.LastMessageSender.String())
		if err != nil {
			return fmt.Errorf("invalid last message sender ID: %w", err)
		}
		gocqlLastMessageSender = &gocqlSender
	}

	updateQuery := `INSERT INTO conversations_by_user
	                (user_id, conversation_id, conversation_type, display_name, display_avatar,
	                 other_user_id, other_user_name, other_user_avatar,
	                 last_message_at, last_message_id, last_message_preview, last_message_sender,
	                 unread_count, last_read_message_id, last_read_at, updated_at)
	                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	return r.session.Query(updateQuery,
		gocqlUserID, gocqlConvID, newEntry.ConversationType,
		newEntry.DisplayName, newEntry.DisplayAvatar,
		gocqlOtherUserID, newEntry.OtherUserName, newEntry.OtherUserAvatar,
		newEntry.LastMessageAt, newEntry.LastMessageID, newEntry.LastMessagePreview,
		gocqlLastMessageSender, newEntry.UnreadCount,
		newEntry.LastReadMessageID, newEntry.LastReadAt, newEntry.UpdatedAt,
	).Exec()
}

func (r *Repository) UpdateConversationPreview(userID, conversationID uuid.UUID, newPreview string) error {
	gocqlUserID, err := gocql.ParseUUID(userID.String())
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}
	gocqlConvID, err := gocql.ParseUUID(conversationID.String())
	if err != nil {
		return fmt.Errorf("invalid conversation ID: %w", err)
	}

	query := `UPDATE conversations_by_user 
	          SET last_message_preview = ?, updated_at = ? 
	          WHERE user_id = ? AND conversation_id = ?`

	if err := r.session.Query(query, newPreview, time.Now(), gocqlUserID, gocqlConvID).Exec(); err != nil {
		return fmt.Errorf("failed to update conversation preview: %w", err)
	}

	return nil
}

type ConversationInboxUpdate struct {
	UserID             uuid.UUID
	ConversationID     uuid.UUID
	ConversationType   string
	DisplayName        string
	DisplayAvatar      string
	OtherUserID        *uuid.UUID
	OtherUserName      string
	OtherUserAvatar    string
	LastMessageAt      gocql.UUID
	LastMessageID      *gocql.UUID
	LastMessagePreview string
	LastMessageSender  *uuid.UUID
	UnreadCount        int
	LastReadMessageID  *gocql.UUID
	LastReadAt         *time.Time
	UpdatedAt          *time.Time
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

	var gocqlEntry struct {
		UserID             gocql.UUID
		ConversationID     gocql.UUID
		ConversationType   string
		DisplayName        string
		DisplayAvatar      string
		OtherUserID        *gocql.UUID
		OtherUserName      string
		OtherUserAvatar    string
		LastMessageAt      gocql.UUID
		LastMessageID      *gocql.UUID
		LastMessagePreview string
		LastMessageSender  *gocql.UUID
		UnreadCount        int
		LastReadMessageID  *gocql.UUID
		LastReadAt         *time.Time
		UpdatedAt          *time.Time
	}

	err = r.preparedQueries["get_inbox_entry"].Bind(gocqlUserID, gocqlConvID).Scan(
		&gocqlEntry.UserID, &gocqlEntry.ConversationID, &gocqlEntry.ConversationType,
		&gocqlEntry.DisplayName, &gocqlEntry.DisplayAvatar,
		&gocqlEntry.OtherUserID, &gocqlEntry.OtherUserName, &gocqlEntry.OtherUserAvatar,
		&gocqlEntry.LastMessageAt, &gocqlEntry.LastMessageID, &gocqlEntry.LastMessagePreview,
		&gocqlEntry.LastMessageSender, &gocqlEntry.UnreadCount,
		&gocqlEntry.LastReadMessageID, &gocqlEntry.LastReadAt, &gocqlEntry.UpdatedAt,
	)

	if err != nil {
		if err == gocql.ErrNotFound {
			return nil, nil, nil
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
		UserID:             resultUserID,
		ConversationID:     resultConvID,
		ConversationType:   gocqlEntry.ConversationType,
		DisplayName:        gocqlEntry.DisplayName,
		DisplayAvatar:      gocqlEntry.DisplayAvatar,
		OtherUserName:      gocqlEntry.OtherUserName,
		OtherUserAvatar:    gocqlEntry.OtherUserAvatar,
		LastMessageAt:      gocqlEntry.LastMessageAt,
		LastMessageID:      gocqlEntry.LastMessageID,
		LastMessagePreview: gocqlEntry.LastMessagePreview,
		UnreadCount:        gocqlEntry.UnreadCount,
		LastReadMessageID:  gocqlEntry.LastReadMessageID,
		LastReadAt:         gocqlEntry.LastReadAt,
		UpdatedAt:          gocqlEntry.UpdatedAt,
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

	return entry, &gocqlEntry.LastMessageAt, nil
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
	          (conversation_id, message_id, sender_id, sender_name, sender_avatar, message_type, content, metadata, created_at, updated_at, reply_to_id)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(query,
		gocqlConvID, msg.MessageID, gocqlSenderID, msg.SenderName, msg.SenderAvatar,
		msg.MessageType, msg.Content, msg.Metadata, msg.CreatedAt, msg.UpdatedAt, gocqlReplyToID,
	)
	return nil
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

	mainQuery := `INSERT INTO conversations_by_user
	              (user_id, conversation_id, conversation_type, display_name, display_avatar,
	               other_user_id, other_user_name, other_user_avatar,
	               last_message_at, last_message_id, last_message_preview, last_message_sender,
	               unread_count, last_read_message_id, last_read_at, updated_at)
	              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(mainQuery,
		gocqlUserID, gocqlConvID, entry.ConversationType,
		entry.DisplayName, entry.DisplayAvatar,
		gocqlOtherUserID, entry.OtherUserName, entry.OtherUserAvatar,
		entry.LastMessageAt, entry.LastMessageID, entry.LastMessagePreview,
		gocqlLastMessageSender, entry.UnreadCount,
		entry.LastReadMessageID, entry.LastReadAt, entry.UpdatedAt,
	)

	return nil
}
