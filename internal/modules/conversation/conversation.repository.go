package conversation

import (
	"fmt"
	"sort"
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
		SELECT user_id, conversation_id, conversation_type, display_name, display_avatar,
		       other_user_id, other_user_name, other_user_avatar,
		       last_message_at, last_message_id, last_message_preview, last_message_sender,
		       unread_count, last_read_message_id, last_read_at, updated_at
		FROM conversations_by_user WHERE user_id = ? AND conversation_id = ?
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
		SELECT user_id, conversation_id, hidden_at, is_archived, is_muted
		FROM hidden_conversations
		WHERE user_id = ? AND conversation_id = ?
	`)

	r.preparedQueries["get_all_user_conversations"] = session.Query(`
		SELECT user_id, conversation_id, conversation_type, display_name, display_avatar,
		       other_user_id, other_user_name, other_user_avatar,
		       last_message_at, last_message_id, last_message_preview, last_message_sender,
		       unread_count, last_read_message_id, last_read_at, updated_at
		FROM conversations_by_user
		WHERE user_id = ?
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

type DirectConversationPair struct {
	UserA          uuid.UUID
	UserB          uuid.UUID
	ConversationID uuid.UUID
}

type HiddenConversation struct {
	UserID         uuid.UUID
	ConversationID uuid.UUID
	HiddenAt       time.Time
	IsArchived     bool
	IsMuted        bool
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
	query := `INSERT INTO conversations_by_user
	          (user_id, conversation_id, conversation_type, display_name, display_avatar,
	           other_user_id, other_user_name, other_user_avatar,
	           last_message_at, last_message_id, last_message_preview, last_message_sender,
	           unread_count, last_read_message_id, last_read_at, updated_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	var otherUserID interface{}
	if conv.OtherUserID != nil {
		otherUserID = *conv.OtherUserID
	}

	var lastMessageID interface{}
	if conv.LastMessageID != nil {
		lastMessageID = *conv.LastMessageID
	}

	var lastMessageSender interface{}
	if conv.LastMessageSender != nil {
		lastMessageSender = *conv.LastMessageSender
	}

	var lastReadMessageID interface{}
	if conv.LastReadMessageID != nil {
		lastReadMessageID = *conv.LastReadMessageID
	}

	return r.session.Query(query,
		conv.UserID, conv.ConversationID, conv.ConversationType, conv.DisplayName, conv.DisplayAvatar,
		otherUserID, conv.OtherUserName, conv.OtherUserAvatar,
		conv.LastMessageAt, lastMessageID, conv.LastMessagePreview, lastMessageSender,
		conv.UnreadCount, lastReadMessageID, conv.LastReadAt, conv.UpdatedAt,
	).Exec()
}

type OtherUserReadState struct {
	UserID            uuid.UUID
	ConversationID    uuid.UUID
	LastReadMessageID *gocql.UUID
}

func (r *Repository) GetOtherUsersLastRead(pairs []OtherUserReadState) (map[string]*gocql.UUID, error) {
	result := make(map[string]*gocql.UUID, len(pairs))
	if len(pairs) == 0 {
		return result, nil
	}

	for _, p := range pairs {
		gocqlUserID, err := gocql.ParseUUID(p.UserID.String())
		if err != nil {
			continue
		}
		gocqlConvID, err := gocql.ParseUUID(p.ConversationID.String())
		if err != nil {
			continue
		}

		var lastRead *gocql.UUID
		err = r.session.Query(
			`SELECT last_read_message_id FROM conversations_by_user
			 WHERE user_id = ? AND conversation_id = ?`,
			gocqlUserID, gocqlConvID,
		).Scan(&lastRead)
		if err != nil && err != gocql.ErrNotFound {
			continue
		}
		key := p.UserID.String() + ":" + p.ConversationID.String()
		result[key] = lastRead
	}
	return result, nil
}

func (r *Repository) GetUserConversations(userID uuid.UUID, limit int) ([]ConversationByUser, error) {
	gocqlUserID, err := gocql.ParseUUID(userID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to convert user ID: %w", err)
	}

	var conversations []ConversationByUser
	iter := r.preparedQueries["get_all_user_conversations"].Bind(gocqlUserID).Iter()

	var conv ConversationByUser
	for iter.Scan(
		&conv.UserID, &conv.ConversationID, &conv.ConversationType, &conv.DisplayName, &conv.DisplayAvatar,
		&conv.OtherUserID, &conv.OtherUserName, &conv.OtherUserAvatar,
		&conv.LastMessageAt, &conv.LastMessageID, &conv.LastMessagePreview, &conv.LastMessageSender,
		&conv.UnreadCount, &conv.LastReadMessageID, &conv.LastReadAt, &conv.UpdatedAt,
	) {
		conversations = append(conversations, conv)
	}

	if err := iter.Close(); err != nil {
		return nil, err
	}

	sort.Slice(conversations, func(i, j int) bool {
		timeI := conversations[i].LastMessageAt.Time()
		timeJ := conversations[j].LastMessageAt.Time()
		return timeI.After(timeJ)
	})

	if limit > 0 && len(conversations) > limit {
		conversations = conversations[:limit]
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

func (r *Repository) UpdateConversationInUserInbox(userID, conversationID uuid.UUID, conv *ConversationByUser) error {
	query := `INSERT INTO conversations_by_user
	          (user_id, conversation_id, conversation_type, display_name, display_avatar,
	           other_user_id, other_user_name, other_user_avatar,
	           last_message_at, last_message_id, last_message_preview, last_message_sender,
	           unread_count, last_read_message_id, last_read_at, updated_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	return r.session.Query(query,
		conv.UserID, conv.ConversationID, conv.ConversationType, conv.DisplayName, conv.DisplayAvatar,
		conv.OtherUserID, conv.OtherUserName, conv.OtherUserAvatar,
		conv.LastMessageAt, conv.LastMessageID, conv.LastMessagePreview, conv.LastMessageSender,
		conv.UnreadCount, conv.LastReadMessageID, conv.LastReadAt, conv.UpdatedAt,
	).Exec()
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
	          (user_id, conversation_id, conversation_type, display_name, display_avatar,
	           other_user_id, other_user_name, other_user_avatar,
	           last_message_at, last_message_id, last_message_preview, last_message_sender,
	           unread_count, last_read_message_id, last_read_at, updated_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	var otherUserID interface{}
	if conv.OtherUserID != nil {
		otherUserID = *conv.OtherUserID
	}

	var lastMessageID interface{}
	if conv.LastMessageID != nil {
		lastMessageID = *conv.LastMessageID
	}

	var lastMessageSender interface{}
	if conv.LastMessageSender != nil {
		lastMessageSender = *conv.LastMessageSender
	}

	var lastReadMessageID interface{}
	if conv.LastReadMessageID != nil {
		lastReadMessageID = *conv.LastReadMessageID
	}

	values := []interface{}{
		conv.UserID,
		conv.ConversationID,
		conv.ConversationType,
		conv.DisplayName,
		conv.DisplayAvatar,
		otherUserID,
		conv.OtherUserName,
		conv.OtherUserAvatar,
		conv.LastMessageAt,
		lastMessageID,
		conv.LastMessagePreview,
		lastMessageSender,
		conv.UnreadCount,
		lastReadMessageID,
		conv.LastReadAt,
		conv.UpdatedAt,
	}

	batch.Query(query, values...)
}

func (r *Repository) AddDirectConversationPairToBatch(batch *gocql.Batch, userA, userB, conversationID uuid.UUID) {
	query := `INSERT INTO direct_conversations_by_user_pair (user_a, user_b, conversation_id) VALUES (?, ?, ?)`

	gocqlUserA, _ := gocql.ParseUUID(userA.String())
	gocqlUserB, _ := gocql.ParseUUID(userB.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	batch.Query(query, gocqlUserA, gocqlUserB, gocqlConvID)
}

func (r *Repository) TryInsertDirectConversationPair(userA, userB, conversationID uuid.UUID) (applied bool, existingConvID *uuid.UUID, err error) {
	gocqlUserA, _ := gocql.ParseUUID(userA.String())
	gocqlUserB, _ := gocql.ParseUUID(userB.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	query := `INSERT INTO direct_conversations_by_user_pair (user_a, user_b, conversation_id) 
	          VALUES (?, ?, ?) IF NOT EXISTS`

	var appliedResult bool
	var existingUserA, existingUserB, existingGocqlConvID gocql.UUID

	err = r.session.Query(query, gocqlUserA, gocqlUserB, gocqlConvID).Scan(
		&appliedResult, &existingUserA, &existingUserB, &existingGocqlConvID,
	)
	if err != nil {
		return false, nil, fmt.Errorf("LWT query failed: %w", err)
	}

	if !appliedResult {
		existingID, _ := uuid.Parse(existingGocqlConvID.String())
		return false, &existingID, nil
	}

	return true, nil, nil
}

func (r *Repository) GetUserConversationByID(userID, conversationID uuid.UUID) (*ConversationByUser, error) {
	gocqlUserID, _ := gocql.ParseUUID(userID.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	var conv ConversationByUser
	query := `SELECT user_id, conversation_id, conversation_type, display_name, display_avatar,
	                 other_user_id, other_user_name, other_user_avatar,
	                 last_message_at, last_message_id, last_message_preview, last_message_sender,
	                 unread_count, last_read_message_id, last_read_at, updated_at
	          FROM conversations_by_user WHERE user_id = ? AND conversation_id = ?`
	err := r.session.Query(query, gocqlUserID, gocqlConvID).Scan(
		&conv.UserID, &conv.ConversationID, &conv.ConversationType, &conv.DisplayName, &conv.DisplayAvatar,
		&conv.OtherUserID, &conv.OtherUserName, &conv.OtherUserAvatar,
		&conv.LastMessageAt, &conv.LastMessageID, &conv.LastMessagePreview, &conv.LastMessageSender,
		&conv.UnreadCount, &conv.LastReadMessageID, &conv.LastReadAt, &conv.UpdatedAt,
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
		UserID         gocql.UUID
		ConversationID gocql.UUID
		HiddenAt       time.Time
		IsArchived     bool
		IsMuted        bool
	}

	err := r.preparedQueries["get_hidden_conversation"].Bind(gocqlUserID, gocqlConvID).Scan(
		&gocqlHidden.UserID, &gocqlHidden.ConversationID, &gocqlHidden.HiddenAt,
		&gocqlHidden.IsArchived, &gocqlHidden.IsMuted,
	)
	if err == gocql.ErrNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	resultUserID, _ := uuid.Parse(gocqlHidden.UserID.String())
	resultConvID, _ := uuid.Parse(gocqlHidden.ConversationID.String())

	return &HiddenConversation{
		UserID:         resultUserID,
		ConversationID: resultConvID,
		HiddenAt:       gocqlHidden.HiddenAt,
		IsArchived:     gocqlHidden.IsArchived,
		IsMuted:        gocqlHidden.IsMuted,
	}, nil
}

// HideConversation moves a conversation from inbox to hidden
func (r *Repository) HideConversation(userID, conversationID uuid.UUID) error {
	batch := r.session.NewBatch(gocql.LoggedBatch)

	gocqlUserID, _ := gocql.ParseUUID(userID.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	deleteQuery := `DELETE FROM conversations_by_user WHERE user_id = ? AND conversation_id = ?`
	batch.Query(deleteQuery, gocqlUserID, gocqlConvID)

	insertHiddenQuery := `INSERT INTO hidden_conversations 
	                      (user_id, conversation_id, hidden_at, is_archived, is_muted)
	                      VALUES (?, ?, ?, ?, ?)`
	batch.Query(insertHiddenQuery, gocqlUserID, gocqlConvID, time.Now(), false, false)

	return r.session.ExecuteBatch(batch)
}

func (r *Repository) UnhideConversation(userID, conversationID uuid.UUID, newLastMessageAt gocql.UUID,
	lastMessageID *gocql.UUID, lastMessagePreview string, lastMessageSender *uuid.UUID,
	conversationType, displayName, displayAvatar string, otherUserID *gocql.UUID, otherUserName, otherUserAvatar string,
	unreadCount int) error {

	batch := r.session.NewBatch(gocql.LoggedBatch)

	gocqlUserID, _ := gocql.ParseUUID(userID.String())
	gocqlConvID, _ := gocql.ParseUUID(conversationID.String())

	deleteHiddenQuery := `DELETE FROM hidden_conversations WHERE user_id = ? AND conversation_id = ?`
	batch.Query(deleteHiddenQuery, gocqlUserID, gocqlConvID)

	var gocqlLastMessageSender *gocql.UUID
	if lastMessageSender != nil {
		gocqlSender, _ := gocql.ParseUUID(lastMessageSender.String())
		gocqlLastMessageSender = &gocqlSender
	}

	now := time.Now()
	insertInboxQuery := `INSERT INTO conversations_by_user
	                     (user_id, conversation_id, conversation_type, display_name, display_avatar,
	                      other_user_id, other_user_name, other_user_avatar,
	                      last_message_at, last_message_id, last_message_preview, last_message_sender,
	                      unread_count, last_read_message_id, last_read_at, updated_at)
	                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	batch.Query(insertInboxQuery,
		gocqlUserID, gocqlConvID, conversationType, displayName, displayAvatar,
		otherUserID, otherUserName, otherUserAvatar,
		newLastMessageAt, lastMessageID, lastMessagePreview, gocqlLastMessageSender,
		unreadCount, nil, nil, now,
	)

	return r.session.ExecuteBatch(batch)
}

