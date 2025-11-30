package conversation

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
		logger:  logger.Named("[conversation_repository]"),
	}
}

type Conversation struct {
	ConversationID   uuid.UUID
	Type             string
	Name             string
	Avatar           string
	CreatedBy        uuid.UUID
	CreatedAt        time.Time
	UpdatedAt        time.Time
	ParticipantCount int
}

type ConversationMember struct {
	ConversationID uuid.UUID
	UserID         uuid.UUID
	JoinedAt       time.Time
	LeftAt         *time.Time
	IsActive       bool
	Role           string
}

type ConversationByUser struct {
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

type DirectConversationPair struct {
	UserA          uuid.UUID
	UserB          uuid.UUID
	ConversationID uuid.UUID
}

// CreateConversation inserts a new conversation into the conversations table
func (r *Repository) CreateConversation(conv *Conversation) error {
	query := `INSERT INTO conversations (conversation_id, type, name, avatar, created_by, created_at, updated_at, participant_count)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	return r.session.Query(query,
		conv.ConversationID, conv.Type, conv.Name, conv.Avatar,
		conv.CreatedBy, conv.CreatedAt, conv.UpdatedAt, conv.ParticipantCount,
	).Exec()
}

// GetConversationByID retrieves conversation metadata
func (r *Repository) GetConversationByID(conversationID uuid.UUID) (*Conversation, error) {
	var conv Conversation
	query := `SELECT conversation_id, type, name, avatar, created_by, created_at, updated_at, participant_count
	          FROM conversations WHERE conversation_id = ?`
	err := r.session.Query(query, conversationID).Scan(
		&conv.ConversationID, &conv.Type, &conv.Name, &conv.Avatar,
		&conv.CreatedBy, &conv.CreatedAt, &conv.UpdatedAt, &conv.ParticipantCount,
	)
	if err != nil {
		return nil, err
	}
	return &conv, nil
}

// AddMember adds a member to a conversation
func (r *Repository) AddMember(member *ConversationMember) error {
	query := `INSERT INTO conversation_members_by_conversation
	          (conversation_id, user_id, joined_at, is_active, role)
	          VALUES (?, ?, ?, ?, ?)`
	return r.session.Query(query,
		member.ConversationID, member.UserID, member.JoinedAt, member.IsActive, member.Role,
	).Exec()
}

// GetMembers retrieves all members of a conversation
func (r *Repository) GetMembers(conversationID uuid.UUID) ([]ConversationMember, error) {
	var members []ConversationMember
	query := `SELECT conversation_id, user_id, joined_at, left_at, is_active, role
	          FROM conversation_members_by_conversation WHERE conversation_id = ?`
	iter := r.session.Query(query, conversationID).Iter()

	var member ConversationMember
	for iter.Scan(&member.ConversationID, &member.UserID, &member.JoinedAt, &member.LeftAt, &member.IsActive, &member.Role) {
		members = append(members, member)
	}

	if err := iter.Close(); err != nil {
		return nil, err
	}
	return members, nil
}

// AddConversationToUserInbox adds/updates a conversation in user's inbox (conversations_by_user)
func (r *Repository) AddConversationToUserInbox(conv *ConversationByUser) error {
	query := `INSERT INTO conversations_by_user
	          (user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	           title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	return r.session.Query(query,
		conv.UserID, conv.LastMessageAt, conv.ConversationID, conv.IsGroup, conv.OtherUserID, conv.OtherUserName, conv.OtherUserAvatar,
		conv.Title, conv.Avatar, conv.LastMessageID, conv.LastMessageBody, conv.LastMessageSender, conv.UnreadCount, conv.LastReadMessageID, conv.LastReadAt,
	).Exec()
}

// GetUserConversations retrieves user's conversation list (inbox view)
func (r *Repository) GetUserConversations(userID uuid.UUID, limit int) ([]ConversationByUser, error) {
	var conversations []ConversationByUser
	query := `SELECT user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	                 title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at
	          FROM conversations_by_user WHERE user_id = ? LIMIT ?`
	iter := r.session.Query(query, userID, limit).Iter()

	var conv ConversationByUser
	for iter.Scan(&conv.UserID, &conv.LastMessageAt, &conv.ConversationID, &conv.IsGroup, &conv.OtherUserID, &conv.OtherUserName, &conv.OtherUserAvatar,
		&conv.Title, &conv.Avatar, &conv.LastMessageID, &conv.LastMessageBody, &conv.LastMessageSender, &conv.UnreadCount, &conv.LastReadMessageID, &conv.LastReadAt) {
		conversations = append(conversations, conv)
	}

	if err := iter.Close(); err != nil {
		return nil, err
	}
	return conversations, nil
}

// GetOrCreateDirectConversation checks if direct conversation exists, otherwise creates one
func (r *Repository) GetOrCreateDirectConversation(user1ID, user2ID uuid.UUID) (uuid.UUID, bool, error) {
	// Ensure user1ID < user2ID for consistent lookup
	userA, userB := user1ID, user2ID
	if user1ID.String() > user2ID.String() {
		userA, userB = user2ID, user1ID
	}

	// Check if direct conversation already exists
	var conversationID uuid.UUID
	query := `SELECT conversation_id FROM direct_conversations_by_user_pair WHERE user_a = ? AND user_b = ?`
	err := r.session.Query(query, userA, userB).Scan(&conversationID)

	if err == nil {
		// Conversation exists
		return conversationID, false, nil
	}

	if err != gocql.ErrNotFound {
		return uuid.Nil, false, fmt.Errorf("failed to check existing conversation: %w", err)
	}

	// Create new conversation
	conversationID = uuid.New()
	insertQuery := `INSERT INTO direct_conversations_by_user_pair (user_a, user_b, conversation_id) VALUES (?, ?, ?)`
	if err := r.session.Query(insertQuery, userA, userB, conversationID).Exec(); err != nil {
		return uuid.Nil, false, fmt.Errorf("failed to create direct conversation pair: %w", err)
	}

	return conversationID, true, nil
}

// UpdateConversationInUserInbox updates an existing conversation entry in user's inbox
func (r *Repository) UpdateConversationInUserInbox(userID uuid.UUID, oldLastMessageAt gocql.UUID, conv *ConversationByUser) error {
	// Delete old entry
	deleteQuery := `DELETE FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	if err := r.session.Query(deleteQuery, userID, oldLastMessageAt, conv.ConversationID).Exec(); err != nil {
		return fmt.Errorf("failed to delete old entry: %w", err)
	}

	// Insert new entry with updated last_message_at
	return r.AddConversationToUserInbox(conv)
}

// MarkAsRead updates read status for a user in a conversation
func (r *Repository) MarkAsRead(conversationID, userID uuid.UUID, lastReadMessageID gocql.UUID, lastReadAt time.Time) error {
	query := `INSERT INTO conversation_read_by_user (conversation_id, user_id, last_read_message_id, last_read_at)
	          VALUES (?, ?, ?, ?)`
	return r.session.Query(query, conversationID, userID, lastReadMessageID, lastReadAt).Exec()
}

// GetReadStatus retrieves read status for a user in a conversation
func (r *Repository) GetReadStatus(conversationID, userID uuid.UUID) (*gocql.UUID, *time.Time, error) {
	var lastReadMessageID gocql.UUID
	var lastReadAt time.Time
	query := `SELECT last_read_message_id, last_read_at FROM conversation_read_by_user
	          WHERE conversation_id = ? AND user_id = ?`
	err := r.session.Query(query, conversationID, userID).Scan(&lastReadMessageID, &lastReadAt)
	if err == gocql.ErrNotFound {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	return &lastReadMessageID, &lastReadAt, nil
}
