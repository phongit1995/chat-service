package conversation

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
		logger:          logger.Named("[conversation_repository]"),
		preparedQueries: make(map[string]*gocql.Query),
	}

	r.preparedQueries["create_conversation"] = session.Query(`
		INSERT INTO conversations (conversation_id, type, name, avatar, created_by, created_at, updated_at, participant_count)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`)

	r.preparedQueries["get_conversation"] = session.Query(`
		SELECT conversation_id, type, name, avatar, created_by, created_at, updated_at, participant_count
		FROM conversations WHERE conversation_id = ?
	`)

	r.preparedQueries["add_member"] = session.Query(`
		INSERT INTO conversation_members_by_conversation
		(conversation_id, user_id, joined_at, is_active, role)
		VALUES (?, ?, ?, ?, ?)
	`)

	r.preparedQueries["get_members"] = session.Query(`
		SELECT conversation_id, user_id, joined_at, left_at, is_active, role
		FROM conversation_members_by_conversation WHERE conversation_id = ?
	`)

	r.preparedQueries["get_user_conversations"] = session.Query(`
		SELECT user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
		       title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at
		FROM conversations_by_user WHERE user_id = ? LIMIT ?
	`)

	r.preparedQueries["get_direct_conversation"] = session.Query(`
		SELECT conversation_id FROM direct_conversations_by_user_pair WHERE user_a = ? AND user_b = ?
	`)

	r.preparedQueries["create_direct_pair"] = session.Query(`
		INSERT INTO direct_conversations_by_user_pair (user_a, user_b, conversation_id) VALUES (?, ?, ?)
	`)

	r.preparedQueries["mark_as_read"] = session.Query(`
		INSERT INTO conversation_read_by_user (conversation_id, user_id, last_read_message_id, last_read_at)
		VALUES (?, ?, ?, ?)
	`)

	r.preparedQueries["get_read_status"] = session.Query(`
		SELECT last_read_message_id, last_read_at FROM conversation_read_by_user
		WHERE conversation_id = ? AND user_id = ?
	`)

	r.preparedQueries["check_hidden"] = session.Query(`
		SELECT conversation_id FROM hidden_conversations
		WHERE user_id = ? AND conversation_id = ?
	`)

	r.preparedQueries["get_hidden_conversation"] = session.Query(`
		SELECT user_id, conversation_id, hidden_at, is_group, other_user_id, 
		       other_user_name, other_user_avatar, title, avatar
		FROM hidden_conversations
		WHERE user_id = ? AND conversation_id = ?
	`)

	return r
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

type DirectConversationPair struct {
	UserA          uuid.UUID
	UserB          uuid.UUID
	ConversationID uuid.UUID
}

type HiddenConversation struct {
	UserID          uuid.UUID
	ConversationID  uuid.UUID
	HiddenAt        time.Time
	IsGroup         bool
	OtherUserID     *uuid.UUID
	OtherUserName   string
	OtherUserAvatar string
	Title           string
	Avatar          string
}

func (r *Repository) CreateConversation(conv *Conversation) error {
	gocqlConvID, _ := gocql.ParseUUID(conv.ConversationID.String())
	gocqlCreatedBy, _ := gocql.ParseUUID(conv.CreatedBy.String())

	return r.preparedQueries["create_conversation"].Bind(
		gocqlConvID, conv.Type, conv.Name, conv.Avatar,
		gocqlCreatedBy, conv.CreatedAt, conv.UpdatedAt, conv.ParticipantCount,
	).Exec()
}

func (r *Repository) GetConversationByID(conversationID uuid.UUID) (*Conversation, error) {
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	var gocqlConv struct {
		ConversationID   gocql.UUID
		Type             string
		Name             string
		Avatar           string
		CreatedBy        gocql.UUID
		CreatedAt        time.Time
		UpdatedAt        time.Time
		ParticipantCount int
	}

	err := r.preparedQueries["get_conversation"].Bind(gocqlConvID).Scan(
		&gocqlConv.ConversationID, &gocqlConv.Type, &gocqlConv.Name, &gocqlConv.Avatar,
		&gocqlConv.CreatedBy, &gocqlConv.CreatedAt, &gocqlConv.UpdatedAt, &gocqlConv.ParticipantCount,
	)
	if err != nil {
		return nil, err
	}

	// Convert back to uuid.UUID
	convID, _ := uuid.Parse(gocqlConv.ConversationID.String())
	createdBy, _ := uuid.Parse(gocqlConv.CreatedBy.String())

	return &Conversation{
		ConversationID:   convID,
		Type:             gocqlConv.Type,
		Name:             gocqlConv.Name,
		Avatar:           gocqlConv.Avatar,
		CreatedBy:        createdBy,
		CreatedAt:        gocqlConv.CreatedAt,
		UpdatedAt:        gocqlConv.UpdatedAt,
		ParticipantCount: gocqlConv.ParticipantCount,
	}, nil
}

func (r *Repository) AddMember(member *ConversationMember) error {
	gocqlConvID, _ := gocql.ParseUUID(member.ConversationID.String())
	gocqlUserID, _ := gocql.ParseUUID(member.UserID.String())

	return r.preparedQueries["add_member"].Bind(
		gocqlConvID, gocqlUserID, member.JoinedAt, member.IsActive, member.Role,
	).Exec()
}

func (r *Repository) GetMembers(conversationID uuid.UUID) ([]ConversationMember, error) {
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	var members []ConversationMember
	iter := r.preparedQueries["get_members"].Bind(gocqlConvID).Iter()

	var gocqlMember struct {
		ConversationID gocql.UUID
		UserID         gocql.UUID
		JoinedAt       time.Time
		LeftAt         *time.Time
		IsActive       bool
		Role           string
	}

	for iter.Scan(&gocqlMember.ConversationID, &gocqlMember.UserID, &gocqlMember.JoinedAt,
		&gocqlMember.LeftAt, &gocqlMember.IsActive, &gocqlMember.Role) {

		// Convert gocql.UUID to uuid.UUID
		convID, _ := uuid.Parse(gocqlMember.ConversationID.String())
		userID, _ := uuid.Parse(gocqlMember.UserID.String())

		members = append(members, ConversationMember{
			ConversationID: convID,
			UserID:         userID,
			JoinedAt:       gocqlMember.JoinedAt,
			LeftAt:         gocqlMember.LeftAt,
			IsActive:       gocqlMember.IsActive,
			Role:           gocqlMember.Role,
		})
	}

	if err := iter.Close(); err != nil {
		return nil, err
	}
	return members, nil
}

func (r *Repository) AddConversationToUserInbox(conv *ConversationByUser) error {
	batch := r.session.NewBatch(gocql.UnloggedBatch)

	query := `INSERT INTO conversations_by_user
	          (user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	           title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(query,
		conv.UserID, conv.LastMessageAt, conv.ConversationID, conv.IsGroup, conv.OtherUserID, conv.OtherUserName, conv.OtherUserAvatar,
		conv.Title, conv.Avatar, conv.LastMessageID, conv.LastMessageBody, conv.LastMessageSender, conv.UnreadCount, conv.LastReadMessageID, conv.LastReadAt,
	)

	lookupQuery := `INSERT INTO conversation_user_lookup (user_id, conversation_id, last_message_at) VALUES (?, ?, ?)`
	batch.Query(lookupQuery, conv.UserID, conv.ConversationID, conv.LastMessageAt)

	return r.session.ExecuteBatch(batch)
}

func (r *Repository) GetUserConversations(userID uuid.UUID, limit int) ([]ConversationByUser, error) {
	var conversations []ConversationByUser
	gocqlUserID, err := gocql.ParseUUID(userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to convert user ID: %w", err)
	}
	iter := r.preparedQueries["get_user_conversations"].Bind(gocqlUserID, limit).Iter()

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

func (r *Repository) GetOrCreateDirectConversation(user1ID, user2ID uuid.UUID) (uuid.UUID, bool, error) {
	userA, userB := user1ID, user2ID
	if user1ID.String() > user2ID.String() {
		userA, userB = user2ID, user1ID
	}

	gocqlUserA, _ := gocql.ParseUUID(userA.String())
	gocqlUserB, _ := gocql.ParseUUID(userB.String())

	var gocqlConvID gocql.UUID
	err := r.preparedQueries["get_direct_conversation"].Bind(gocqlUserA, gocqlUserB).Scan(&gocqlConvID)

	if err == nil {
		conversationID, _ := uuid.Parse(gocqlConvID.String())
		return conversationID, false, nil
	}

	if err != gocql.ErrNotFound {
		return uuid.Nil, false, fmt.Errorf("failed to check existing conversation: %w", err)
	}

	conversationID := uuid.New()
	gocqlNewConvID, _ := gocql.ParseUUID(conversationID.String())

	if err := r.preparedQueries["create_direct_pair"].Bind(gocqlUserA, gocqlUserB, gocqlNewConvID).Exec(); err != nil {
		return uuid.Nil, false, fmt.Errorf("failed to create direct conversation pair: %w", err)
	}

	return conversationID, true, nil
}

func (r *Repository) GetDirectConversationID(userA, userB uuid.UUID) (*uuid.UUID, error) {
	var conversationID gocql.UUID
	query := `SELECT conversation_id FROM direct_conversations_by_user_pair WHERE user_a = ? AND user_b = ?`

	// Convert uuid.UUID to gocql.UUID for querying
	gocqlUserA, _ := gocql.ParseUUID(userA.String())
	gocqlUserB, _ := gocql.ParseUUID(userB.String())

	err := r.session.Query(query, gocqlUserA, gocqlUserB).Scan(&conversationID)
	if err == gocql.ErrNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Convert back to uuid.UUID
	resultUUID, err := uuid.Parse(conversationID.String())
	if err != nil {
		return nil, err
	}
	return &resultUUID, nil
}

func (r *Repository) UpdateConversationInUserInbox(userID uuid.UUID, oldLastMessageAt gocql.UUID, conv *ConversationByUser) error {
	batch := r.session.NewBatch(gocql.UnloggedBatch)

	gocqlUserID, _ := gocql.ParseUUID(userID.String())

	deleteQuery := `DELETE FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	batch.Query(deleteQuery, gocqlUserID, oldLastMessageAt, conv.ConversationID)

	insertQuery := `INSERT INTO conversations_by_user
	                (user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	                 title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at)
	                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(insertQuery,
		conv.UserID, conv.LastMessageAt, conv.ConversationID, conv.IsGroup, conv.OtherUserID, conv.OtherUserName, conv.OtherUserAvatar,
		conv.Title, conv.Avatar, conv.LastMessageID, conv.LastMessageBody, conv.LastMessageSender, conv.UnreadCount, conv.LastReadMessageID, conv.LastReadAt,
	)

	lookupQuery := `INSERT INTO conversation_user_lookup (user_id, conversation_id, last_message_at) VALUES (?, ?, ?)`
	batch.Query(lookupQuery, conv.UserID, conv.ConversationID, conv.LastMessageAt)

	return r.session.ExecuteBatch(batch)
}

func (r *Repository) MarkAsRead(conversationID, userID uuid.UUID, lastReadMessageID gocql.UUID, lastReadAt time.Time) error {
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())
	gocqlUserID, _ := gocql.ParseUUID(userID.String())

	return r.preparedQueries["mark_as_read"].Bind(gocqlConvID, gocqlUserID, lastReadMessageID, lastReadAt).Exec()
}

func (r *Repository) GetReadStatus(conversationID, userID uuid.UUID) (*gocql.UUID, *time.Time, error) {
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())
	gocqlUserID, _ := gocql.ParseUUID(userID.String())

	var lastReadMessageID gocql.UUID
	var lastReadAt time.Time
	err := r.preparedQueries["get_read_status"].Bind(gocqlConvID, gocqlUserID).Scan(&lastReadMessageID, &lastReadAt)
	if err == gocql.ErrNotFound {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}
	return &lastReadMessageID, &lastReadAt, nil
}

func (r *Repository) NewBatch() *gocql.Batch {
	return r.session.NewBatch(gocql.LoggedBatch)
}

func (r *Repository) ExecuteBatch(batch *gocql.Batch) error {
	return r.session.ExecuteBatch(batch)
}

func (r *Repository) AddConversationToBatch(batch *gocql.Batch, conv *Conversation) {
	query := `INSERT INTO conversations (conversation_id, type, name, avatar, created_by, created_at, updated_at, participant_count)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	// Convert uuid.UUID to gocql.UUID
	gocqlConvID, _ := gocql.ParseUUID(conv.ConversationID.String())
	gocqlCreatedBy, _ := gocql.ParseUUID(conv.CreatedBy.String())

	batch.Query(query,
		gocqlConvID, conv.Type, conv.Name, conv.Avatar,
		gocqlCreatedBy, conv.CreatedAt, conv.UpdatedAt, conv.ParticipantCount,
	)
}

func (r *Repository) AddMemberToBatch(batch *gocql.Batch, member *ConversationMember) {
	query := `INSERT INTO conversation_members_by_conversation
	          (conversation_id, user_id, joined_at, is_active, role)
	          VALUES (?, ?, ?, ?, ?)`

	// Convert uuid.UUID to gocql.UUID
	gocqlConvID, _ := gocql.ParseUUID(member.ConversationID.String())
	gocqlUserID, _ := gocql.ParseUUID(member.UserID.String())

	batch.Query(query,
		gocqlConvID, gocqlUserID, member.JoinedAt, member.IsActive, member.Role,
	)
}

func (r *Repository) AddConversationToUserInboxBatch(batch *gocql.Batch, conv *ConversationByUser) {
	query := `INSERT INTO conversations_by_user
	          (user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	           title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(query,
		conv.UserID, conv.LastMessageAt, conv.ConversationID, conv.IsGroup, conv.OtherUserID, conv.OtherUserName, conv.OtherUserAvatar,
		conv.Title, conv.Avatar, conv.LastMessageID, conv.LastMessageBody, conv.LastMessageSender, conv.UnreadCount, conv.LastReadMessageID, conv.LastReadAt,
	)

	lookupQuery := `INSERT INTO conversation_user_lookup (user_id, conversation_id, last_message_at) VALUES (?, ?, ?)`
	batch.Query(lookupQuery, conv.UserID, conv.ConversationID, conv.LastMessageAt)
}

func (r *Repository) AddDirectConversationPairToBatch(batch *gocql.Batch, userA, userB, conversationID uuid.UUID) {
	query := `INSERT INTO direct_conversations_by_user_pair (user_a, user_b, conversation_id) VALUES (?, ?, ?)`

	// Convert uuid.UUID to gocql.UUID
	gocqlUserA, _ := gocql.ParseUUID(userA.String())
	gocqlUserB, _ := gocql.ParseUUID(userB.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	batch.Query(query, gocqlUserA, gocqlUserB, gocqlConvID)
}

func (r *Repository) GetUserConversationByID(userID, conversationID uuid.UUID) (*ConversationByUser, error) {
	gocqlUserID, _ := gocql.ParseUUID(userID.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	var lastMessageAt gocql.UUID
	lookupQuery := `SELECT last_message_at FROM conversation_user_lookup WHERE user_id = ? AND conversation_id = ?`
	err := r.session.Query(lookupQuery, gocqlUserID, gocqlConvID).Scan(&lastMessageAt)
	if err == gocql.ErrNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("lookup failed: %w", err)
	}

	var conv ConversationByUser
	query := `SELECT user_id, last_message_at, conversation_id, is_group, other_user_id, other_user_name, other_user_avatar,
	                 title, avatar, last_message_id, last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at
	          FROM conversations_by_user WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	err = r.session.Query(query, gocqlUserID, lastMessageAt, gocqlConvID).Scan(
		&conv.UserID, &conv.LastMessageAt, &conv.ConversationID, &conv.IsGroup, &conv.OtherUserID, &conv.OtherUserName, &conv.OtherUserAvatar,
		&conv.Title, &conv.Avatar, &conv.LastMessageID, &conv.LastMessageBody, &conv.LastMessageSender, &conv.UnreadCount, &conv.LastReadMessageID, &conv.LastReadAt,
	)
	if err == gocql.ErrNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &conv, nil
}

// CheckIfHidden checks if a conversation is hidden by a user
func (r *Repository) CheckIfHidden(userID, conversationID uuid.UUID) (bool, error) {
	gocqlUserID, _ := gocql.ParseUUID(userID.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	var gocqlResultConvID gocql.UUID
	err := r.preparedQueries["check_hidden"].Bind(gocqlUserID, gocqlConvID).Scan(&gocqlResultConvID)
	if err == gocql.ErrNotFound {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// GetHiddenConversation retrieves hidden conversation data
func (r *Repository) GetHiddenConversation(userID, conversationID uuid.UUID) (*HiddenConversation, error) {
	gocqlUserID, _ := gocql.ParseUUID(userID.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	var gocqlHidden struct {
		UserID          gocql.UUID
		ConversationID  gocql.UUID
		HiddenAt        time.Time
		IsGroup         bool
		OtherUserID     *gocql.UUID
		OtherUserName   string
		OtherUserAvatar string
		Title           string
		Avatar          string
	}

	err := r.preparedQueries["get_hidden_conversation"].Bind(gocqlUserID, gocqlConvID).Scan(
		&gocqlHidden.UserID, &gocqlHidden.ConversationID, &gocqlHidden.HiddenAt,
		&gocqlHidden.IsGroup, &gocqlHidden.OtherUserID, &gocqlHidden.OtherUserName,
		&gocqlHidden.OtherUserAvatar, &gocqlHidden.Title, &gocqlHidden.Avatar,
	)
	if err == gocql.ErrNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Convert gocql.UUID to uuid.UUID
	resultUserID, _ := uuid.Parse(gocqlHidden.UserID.String())
	resultConvID, _ := uuid.Parse(gocqlHidden.ConversationID.String())

	hidden := &HiddenConversation{
		UserID:          resultUserID,
		ConversationID:  resultConvID,
		HiddenAt:        gocqlHidden.HiddenAt,
		IsGroup:         gocqlHidden.IsGroup,
		OtherUserName:   gocqlHidden.OtherUserName,
		OtherUserAvatar: gocqlHidden.OtherUserAvatar,
		Title:           gocqlHidden.Title,
		Avatar:          gocqlHidden.Avatar,
	}

	if gocqlHidden.OtherUserID != nil {
		otherUserID, _ := uuid.Parse(gocqlHidden.OtherUserID.String())
		hidden.OtherUserID = &otherUserID
	}

	return hidden, nil
}

// HideConversation moves a conversation from inbox to hidden
func (r *Repository) HideConversation(userID, conversationID uuid.UUID) error {
	// First, get the current conversation data from inbox
	userConv, err := r.GetUserConversationByID(userID, conversationID)
	if err != nil {
		return fmt.Errorf("failed to get user conversation: %w", err)
	}
	if userConv == nil {
		return fmt.Errorf("conversation not found in user inbox")
	}

	batch := r.session.NewBatch(gocql.UnloggedBatch)

	gocqlUserID, _ := gocql.ParseUUID(userID.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	// Delete from conversations_by_user
	deleteQuery := `DELETE FROM conversations_by_user 
	                WHERE user_id = ? AND last_message_at = ? AND conversation_id = ?`
	batch.Query(deleteQuery, gocqlUserID, userConv.LastMessageAt, gocqlConvID)

	// Delete from lookup table
	deleteLookupQuery := `DELETE FROM conversation_user_lookup 
	                      WHERE user_id = ? AND conversation_id = ?`
	batch.Query(deleteLookupQuery, gocqlUserID, gocqlConvID)

	// Insert into hidden_conversations
	insertHiddenQuery := `INSERT INTO hidden_conversations 
	                      (user_id, conversation_id, hidden_at, is_group, other_user_id, 
	                       other_user_name, other_user_avatar, title, avatar)
	                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(insertHiddenQuery,
		gocqlUserID, gocqlConvID, time.Now(),
		userConv.IsGroup, userConv.OtherUserID, userConv.OtherUserName,
		userConv.OtherUserAvatar, userConv.Title, userConv.Avatar,
	)

	return r.session.ExecuteBatch(batch)
}

// UnhideConversation moves a conversation from hidden back to inbox
func (r *Repository) UnhideConversation(userID, conversationID uuid.UUID, newLastMessageAt gocql.UUID,
	lastMessageID *gocql.UUID, lastMessageBody string, lastMessageSender *uuid.UUID, unreadCount int) error {

	// Get hidden conversation data
	hidden, err := r.GetHiddenConversation(userID, conversationID)
	if err != nil {
		return fmt.Errorf("failed to get hidden conversation: %w", err)
	}
	if hidden == nil {
		return fmt.Errorf("conversation not in hidden list")
	}

	batch := r.session.NewBatch(gocql.UnloggedBatch)

	gocqlUserID, _ := gocql.ParseUUID(userID.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	// Delete from hidden_conversations
	deleteHiddenQuery := `DELETE FROM hidden_conversations 
	                      WHERE user_id = ? AND conversation_id = ?`
	batch.Query(deleteHiddenQuery, gocqlUserID, gocqlConvID)

	// Convert lastMessageSender if present
	var gocqlLastMessageSender *gocql.UUID
	if lastMessageSender != nil {
		gocqlSender, _ := gocql.ParseUUID(lastMessageSender.String())
		gocqlLastMessageSender = &gocqlSender
	}

	// Convert OtherUserID if present
	var gocqlOtherUserID *gocql.UUID
	if hidden.OtherUserID != nil {
		gocqlOther, _ := gocql.ParseUUID(hidden.OtherUserID.String())
		gocqlOtherUserID = &gocqlOther
	}

	// Insert back into conversations_by_user
	insertInboxQuery := `INSERT INTO conversations_by_user
	                     (user_id, last_message_at, conversation_id, is_group, other_user_id, 
	                      other_user_name, other_user_avatar, title, avatar, last_message_id, 
	                      last_message_body, last_message_sender, unread_count, last_read_message_id, last_read_at)
	                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(insertInboxQuery,
		gocqlUserID, newLastMessageAt, gocqlConvID,
		hidden.IsGroup, gocqlOtherUserID, hidden.OtherUserName,
		hidden.OtherUserAvatar, hidden.Title, hidden.Avatar,
		lastMessageID, lastMessageBody, gocqlLastMessageSender, unreadCount,
		nil, nil, // last_read_message_id and last_read_at will be null
	)

	// Insert into lookup table
	insertLookupQuery := `INSERT INTO conversation_user_lookup 
	                      (user_id, conversation_id, last_message_at) VALUES (?, ?, ?)`
	batch.Query(insertLookupQuery, userID, conversationID, newLastMessageAt)

	return r.session.ExecuteBatch(batch)
}
