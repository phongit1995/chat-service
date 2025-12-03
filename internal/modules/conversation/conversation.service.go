package conversation

import (
	"chat-server/internal/models"
	"fmt"
	"time"

	"github.com/gocql/gocql"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type Service struct {
	repo   *Repository
	cache  *CacheService
	db     *gorm.DB
	logger *zap.SugaredLogger
}

func NewService(repo *Repository, cache *CacheService, db *gorm.DB, logger *zap.SugaredLogger) *Service {
	return &Service{
		repo:   repo,
		cache:  cache,
		db:     db,
		logger: logger.Named("[conversation_service]"),
	}
}

func (s *Service) CreateDirectConversation(user1ID, user2ID uuid.UUID) (*ConversationResponse, error) {
	if user1ID == user2ID {
		return nil, fmt.Errorf("cannot create conversation with yourself")
	}

	var user1, user2 models.User
	if err := s.db.First(&user1, "id = ?", user1ID).Error; err != nil {
		return nil, fmt.Errorf("user1 not found: %w", err)
	}
	if err := s.db.First(&user2, "id = ?", user2ID).Error; err != nil {
		return nil, fmt.Errorf("user2 not found: %w", err)
	}

	userA, userB := user1ID, user2ID
	if user1ID.String() > user2ID.String() {
		userA, userB = user2ID, user1ID
	}

	existingConvID, err := s.repo.GetDirectConversationID(userA, userB)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing conversation: %w", err)
	}

	now := time.Now()

	if existingConvID != nil {
		return &ConversationResponse{
			ID:               existingConvID.String(),
			Type:             "direct",
			Name:             user2.Username,
			Avatar:           user2.Avatar,
			CreatedAt:        now.Format(time.RFC3339),
			UpdatedAt:        now.Format(time.RFC3339),
			ParticipantCount: 2,
			IsNew:            false,
		}, nil
	}

	conversationID := uuid.New()
	lastMessageAt := gocql.TimeUUID()

	batch := s.repo.NewBatch()

	s.repo.AddDirectConversationPairToBatch(batch, userA, userB, conversationID)

	conv := &Conversation{
		ConversationID:   conversationID,
		Type:             "direct",
		Name:             "",
		Avatar:           "",
		CreatedBy:        user1ID,
		CreatedAt:        now,
		UpdatedAt:        now,
		ParticipantCount: 2,
	}
	s.repo.AddConversationToBatch(batch, conv)

	member1 := &ConversationMember{
		ConversationID: conversationID,
		UserID:         user1ID,
		JoinedAt:       now,
		IsActive:       true,
		Role:           "member",
	}
	member2 := &ConversationMember{
		ConversationID: conversationID,
		UserID:         user2ID,
		JoinedAt:       now,
		IsActive:       true,
		Role:           "member",
	}
	s.repo.AddMemberToBatch(batch, member1)
	s.repo.AddMemberToBatch(batch, member2)

	inbox1 := &ConversationByUser{
		UserID:          user1ID,
		LastMessageAt:   lastMessageAt,
		ConversationID:  conversationID,
		IsGroup:         false,
		OtherUserID:     &user2ID,
		OtherUserName:   user2.Username,
		OtherUserAvatar: user2.Avatar,
		Title:           user2.Username,
		Avatar:          user2.Avatar,
		UnreadCount:     0,
	}
	inbox2 := &ConversationByUser{
		UserID:          user2ID,
		LastMessageAt:   lastMessageAt,
		ConversationID:  conversationID,
		IsGroup:         false,
		OtherUserID:     &user1ID,
		OtherUserName:   user1.Username,
		OtherUserAvatar: user1.Avatar,
		Title:           user1.Username,
		Avatar:          user1.Avatar,
		UnreadCount:     0,
	}
	s.repo.AddConversationToUserInboxBatch(batch, inbox1)
	s.repo.AddConversationToUserInboxBatch(batch, inbox2)

	if err := s.repo.ExecuteBatch(batch); err != nil {
		return nil, fmt.Errorf("failed to create direct conversation: %w", err)
	}

	go s.InvalidateUserConversationsCache([]uuid.UUID{user1ID, user2ID})

	return &ConversationResponse{
		ID:               conversationID.String(),
		Type:             "direct",
		Name:             user2.Username,
		Avatar:           user2.Avatar,
		CreatedAt:        now.Format(time.RFC3339),
		UpdatedAt:        now.Format(time.RFC3339),
		ParticipantCount: 2,
		IsNew:            true,
	}, nil
}

func (s *Service) CreateGroupConversation(creatorID uuid.UUID, name string, participantIDs []uuid.UUID) (*ConversationResponse, error) {
	if len(participantIDs) < 2 {
		return nil, fmt.Errorf("group conversation must have at least 2 participants")
	}
	if name == "" {
		return nil, fmt.Errorf("group name is required")
	}

	participantIDs = append(participantIDs, creatorID)
	uniqueParticipants := make(map[uuid.UUID]bool)
	for _, id := range participantIDs {
		uniqueParticipants[id] = true
	}

	for participantID := range uniqueParticipants {
		var user models.User
		if err := s.db.First(&user, "id = ?", participantID).Error; err != nil {
			return nil, fmt.Errorf("participant %s not found: %w", participantID, err)
		}
	}

	now := time.Now()
	conversationID := uuid.New()
	lastMessageAt := gocql.TimeUUID()

	batch := s.repo.NewBatch()

	conv := &Conversation{
		ConversationID:   conversationID,
		Type:             "group",
		Name:             name,
		Avatar:           "",
		CreatedBy:        creatorID,
		CreatedAt:        now,
		UpdatedAt:        now,
		ParticipantCount: len(uniqueParticipants),
	}
	s.repo.AddConversationToBatch(batch, conv)

	allParticipantIDs := make([]uuid.UUID, 0, len(uniqueParticipants))
	for participantID := range uniqueParticipants {
		allParticipantIDs = append(allParticipantIDs, participantID)

		role := "member"
		if participantID == creatorID {
			role = "admin"
		}

		member := &ConversationMember{
			ConversationID: conversationID,
			UserID:         participantID,
			JoinedAt:       now,
			IsActive:       true,
			Role:           role,
		}
		s.repo.AddMemberToBatch(batch, member)

		inbox := &ConversationByUser{
			UserID:         participantID,
			LastMessageAt:  lastMessageAt,
			ConversationID: conversationID,
			IsGroup:        true,
			Title:          name,
			Avatar:         "",
			UnreadCount:    0,
		}
		s.repo.AddConversationToUserInboxBatch(batch, inbox)
	}

	if err := s.repo.ExecuteBatch(batch); err != nil {
		return nil, fmt.Errorf("failed to create group conversation: %w", err)
	}

	go s.InvalidateUserConversationsCache(allParticipantIDs)

	return &ConversationResponse{
		ID:               conversationID.String(),
		Type:             "group",
		Name:             name,
		CreatedAt:        now.Format(time.RFC3339),
		UpdatedAt:        now.Format(time.RFC3339),
		ParticipantCount: len(uniqueParticipants),
		IsNew:            true,
	}, nil
}

func (s *Service) GetUserConversations(userID uuid.UUID, limit int) (*ConversationsListResponse, error) {
	conversations, err := s.GetUserConversationsCached(userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get user conversations: %w", err)
	}

	responses := make([]ConversationResponse, 0, len(conversations))
	for _, conv := range conversations {
		resp := ConversationResponse{
			ID:              conv.ConversationID.String(),
			Name:            conv.Title,
			Avatar:          conv.Avatar,
			LastMessageText: conv.LastMessageBody,
			UnreadCount:     conv.UnreadCount,
		}

		if conv.IsGroup {
			resp.Type = "group"
		} else {
			resp.Type = "direct"
		}

		t := conv.LastMessageAt.Time()
		resp.LastMessageAt = t.Format(time.RFC3339)

		responses = append(responses, resp)
	}

	return &ConversationsListResponse{
		Conversations: responses,
		Total:         len(responses),
	}, nil
}

func (s *Service) MarkConversationAsRead(userID, conversationID uuid.UUID) error {
	members, err := s.GetMembersCached(conversationID)
	if err != nil {
		return fmt.Errorf("failed to get members: %w", err)
	}

	isMember := false
	for _, m := range members {
		if m.UserID == userID && m.IsActive {
			isMember = true
			break
		}
	}

	if !isMember {
		return fmt.Errorf("user is not a member of this conversation")
	}

	userConv, err := s.repo.GetUserConversationByID(userID, conversationID)
	if err != nil {
		return fmt.Errorf("failed to get user conversation: %w", err)
	}
	if userConv == nil {
		return fmt.Errorf("conversation not found in user inbox")
	}

	now := time.Now()

	var lastReadMessageID gocql.UUID
	if userConv.LastMessageID != nil {
		lastReadMessageID = *userConv.LastMessageID
	} else {
		lastReadMessageID = userConv.LastMessageAt
	}

	if err := s.repo.MarkAsRead(conversationID, userID, lastReadMessageID, now); err != nil {
		return fmt.Errorf("failed to mark as read: %w", err)
	}

	s.cache.ResetUnreadCount(conversationID, userID)

	return nil
}

func (s *Service) GetMembersCached(conversationID uuid.UUID) ([]ConversationMember, error) {
	if cached, err := s.cache.GetConversationMembers(conversationID); err == nil && len(cached) > 0 {
		s.logger.Debugw("Cache HIT for conversation members", "conversation_id", conversationID)
		return cached, nil
	}

	s.logger.Debugw("Cache MISS for conversation members", "conversation_id", conversationID)
	members, err := s.repo.GetMembers(conversationID)
	if err != nil {
		return nil, err
	}

	go func() {
		if err := s.cache.SetConversationMembers(conversationID, members); err != nil {
			s.logger.Warnw("Failed to cache conversation members", "conversation_id", conversationID, "error", err)
		}
	}()

	return members, nil
}

func (s *Service) GetConversationByIDCached(conversationID uuid.UUID) (*Conversation, error) {
	if cached, err := s.cache.GetConversation(conversationID); err == nil && cached != nil {
		s.logger.Debugw("Cache HIT for conversation", "conversation_id", conversationID)
		return cached, nil
	}

	s.logger.Debugw("Cache MISS for conversation", "conversation_id", conversationID)
	conv, err := s.repo.GetConversationByID(conversationID)
	if err != nil {
		return nil, err
	}

	go func() {
		if err := s.cache.SetConversation(conv); err != nil {
			s.logger.Warnw("Failed to cache conversation", "conversation_id", conversationID, "error", err)
		}
	}()

	return conv, nil
}

func (s *Service) GetUserConversationsCached(userID uuid.UUID, limit int) ([]ConversationByUser, error) {
	if cached, err := s.cache.GetUserConversations(userID); err == nil && len(cached) > 0 {
		s.logger.Debugw("Cache HIT for user conversations", "user_id", userID)
		if len(cached) > limit {
			return cached[:limit], nil
		}
		return cached, nil
	}

	s.logger.Debugw("Cache MISS for user conversations", "user_id", userID)
	conversations, err := s.repo.GetUserConversations(userID, limit)
	if err != nil {
		return nil, err
	}

	go func() {
		if err := s.cache.SetUserConversations(userID, conversations); err != nil {
			s.logger.Warnw("Failed to cache user conversations", "user_id", userID, "error", err)
		}
	}()

	return conversations, nil
}

func (s *Service) InvalidateMembersCache(conversationID uuid.UUID) {
	if err := s.cache.DeleteConversationMembers(conversationID); err != nil {
		s.logger.Warnw("Failed to invalidate members cache", "conversation_id", conversationID, "error", err)
	}
}

func (s *Service) InvalidateUserConversationsCache(userIDs []uuid.UUID) {
	for _, userID := range userIDs {
		if err := s.cache.DeleteUserConversations(userID); err != nil {
			s.logger.Warnw("Failed to invalidate user conversations cache", "user_id", userID, "error", err)
		}
	}
}

func (s *Service) InvalidateConversationCache(conversationID uuid.UUID) {
	s.cache.InvalidateConversation(conversationID)
}
