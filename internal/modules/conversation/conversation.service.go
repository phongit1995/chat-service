package conversation

import (
	"chat-server/internal/constants"
	conversationEvents "chat-server/internal/domain/conversation"
	"chat-server/internal/infra/kafka"
	"chat-server/internal/models"
	userModule "chat-server/internal/modules/user"
	"chat-server/internal/utils"
	"context"
	"fmt"
	"time"

	"github.com/gocql/gocql"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type Service struct {
	repo          *Repository
	cache         *CacheService
	userCache     *userModule.CacheService
	db            *gorm.DB
	kafkaProducer *kafka.Producer
	logger        *zap.SugaredLogger
}

func NewService(repo *Repository, cache *CacheService, userCache *userModule.CacheService, db *gorm.DB, kafkaProducer *kafka.Producer, logger *zap.SugaredLogger) *Service {
	return &Service{
		repo:          repo,
		cache:         cache,
		userCache:     userCache,
		db:            db,
		kafkaProducer: kafkaProducer,
		logger:        logger.Named("[conversation_service]"),
	}
}

func (s *Service) CheckDirectConversation(user1ID, user2ID uuid.UUID) (*ConversationResponse, error) {
	if user1ID == user2ID {
		return nil, fmt.Errorf("cannot check conversation with yourself")
	}

	otherUser, err := s.userCache.GetUserCache(user2ID, true)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	userA, userB := user1ID, user2ID
	if user1ID.String() > user2ID.String() {
		userA, userB = user2ID, user1ID
	}

	existingConvID, err := s.repo.GetDirectConversationID(userA, userB)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing conversation: %w", err)
	}

	if existingConvID == nil {
		return &ConversationResponse{
			ID:               "",
			Type:             "direct",
			Name:             otherUser.Username,
			Avatar:           otherUser.Avatar,
			ParticipantCount: 0,
			IsNew:            true,
		}, nil
	}

	conv, err := s.repo.GetConversationByID(*existingConvID)
	if err != nil {
		return nil, fmt.Errorf("failed to load conversation metadata: %w", err)
	}

	return &ConversationResponse{
		ID:               existingConvID.String(),
		Type:             "direct",
		Name:             otherUser.Username,
		Avatar:           otherUser.Avatar,
		CreatedAt:        conv.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        conv.UpdatedAt.Format(time.RFC3339),
		ParticipantCount: 2,
		IsNew:            false,
	}, nil
}

func (s *Service) CreateDirectConversation(user1ID, user2ID uuid.UUID) (*ConversationResponse, error) {
	if user1ID == user2ID {
		return nil, fmt.Errorf("cannot create conversation with yourself")
	}

	user1, err := s.userCache.GetUserCache(user1ID, true)
	if err != nil {
		return nil, fmt.Errorf("user1 not found: %w", err)
	}
	otherUser, err := s.userCache.GetUserCache(user2ID, true)
	if err != nil {
		return nil, fmt.Errorf("user2 not found: %w", err)
	}

	userA, userB := user1ID, user2ID
	if user1ID.String() > user2ID.String() {
		userA, userB = user2ID, user1ID
	}

	now := time.Now()
	conversationID := uuid.New()

	applied, existingConvID, err := s.repo.TryInsertDirectConversationPair(userA, userB, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to insert direct conversation pair: %w", err)
	}

	if !applied {
		s.logger.Infow("Direct conversation already exists (race condition prevented)",
			"user1", user1ID, "user2", user2ID, "existing_conv_id", existingConvID)
		return &ConversationResponse{
			ID:               existingConvID.String(),
			Type:             "direct",
			Name:             otherUser.Username,
			Avatar:           otherUser.Avatar,
			CreatedAt:        now.Format(time.RFC3339),
			UpdatedAt:        now.Format(time.RFC3339),
			ParticipantCount: 2,
			IsNew:            false,
		}, nil
	}

	lastMessageAt := gocql.TimeUUID()

	batch := s.repo.NewBatch()

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

	gocqlUser1ID, err := utils.ToGocqlUUID(user1ID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert user1ID: %w", err)
	}
	gocqlUser2ID, err := utils.ToGocqlUUID(user2ID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert user2ID: %w", err)
	}
	gocqlConvID, err := utils.ToGocqlUUID(conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert conversationID: %w", err)
	}

	inbox1 := &ConversationByUser{
		UserID:           gocqlUser1ID,
		ConversationID:   gocqlConvID,
		ConversationType: "direct",
		DisplayName:      otherUser.Username,
		DisplayAvatar:    otherUser.Avatar,
		OtherUserID:      &gocqlUser2ID,
		OtherUserName:    otherUser.Username,
		OtherUserAvatar:  otherUser.Avatar,
		LastMessageAt:    lastMessageAt,
		UnreadCount:      0,
		UpdatedAt:        &now,
	}
	inbox2 := &ConversationByUser{
		UserID:           gocqlUser2ID,
		ConversationID:   gocqlConvID,
		ConversationType: "direct",
		DisplayName:      user1.Username,
		DisplayAvatar:    user1.Avatar,
		OtherUserID:      &gocqlUser1ID,
		OtherUserName:    user1.Username,
		OtherUserAvatar:  user1.Avatar,
		LastMessageAt:    lastMessageAt,
		UnreadCount:      0,
		UpdatedAt:        &now,
	}
	s.repo.AddConversationToUserInboxBatch(batch, inbox1)
	s.repo.AddConversationToUserInboxBatch(batch, inbox2)

	if err := s.repo.ExecuteBatch(batch); err != nil {
		return nil, fmt.Errorf("failed to create direct conversation: %w", err)
	}

	members := []ConversationMember{*member1, *member2}

	go func() {
		s.InvalidateUserConversationsCache([]uuid.UUID{user1ID, user2ID})
		if err := s.cache.SetConversationMembers(conversationID, members); err != nil {
			s.logger.Warnw("Failed to cache conversation members after creation",
				"conversation_id", conversationID,
				"error", err,
			)
		} else {
			s.logger.Debugw("Cached conversation members after creation",
				"conversation_id", conversationID,
				"member_count", len(members),
			)
		}
	}()

	return &ConversationResponse{
		ID:               conversationID.String(),
		Type:             "direct",
		Name:             otherUser.Username,
		Avatar:           otherUser.Avatar,
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
	members := make([]ConversationMember, 0, len(uniqueParticipants))
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
		members = append(members, *member)

		gocqlParticipantID, err := utils.ToGocqlUUID(participantID)
		if err != nil {
			return nil, fmt.Errorf("failed to convert participantID: %w", err)
		}
		gocqlConvID, err := utils.ToGocqlUUID(conversationID)
		if err != nil {
			return nil, fmt.Errorf("failed to convert conversationID: %w", err)
		}

		inbox := &ConversationByUser{
			UserID:           gocqlParticipantID,
			ConversationID:   gocqlConvID,
			ConversationType: "group",
			DisplayName:      name,
			DisplayAvatar:    "",
			LastMessageAt:    lastMessageAt,
			UnreadCount:      0,
			UpdatedAt:        &now,
		}
		s.repo.AddConversationToUserInboxBatch(batch, inbox)
	}

	if err := s.repo.ExecuteBatch(batch); err != nil {
		return nil, fmt.Errorf("failed to create group conversation: %w", err)
	}

	go func() {
		s.InvalidateUserConversationsCache(allParticipantIDs)
		if err := s.cache.SetConversationMembers(conversationID, members); err != nil {
			s.logger.Warnw("Failed to cache conversation members after creation",
				"conversation_id", conversationID,
				"error", err,
			)
		} else {
			s.logger.Debugw("Cached conversation members after creation",
				"conversation_id", conversationID,
				"member_count", len(members),
			)
		}
	}()

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
	conversations, err := s.repo.GetUserConversations(userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get user conversations: %w", err)
	}

	responses := make([]ConversationResponse, 0, len(conversations))
	for _, conv := range conversations {
		resp := ConversationResponse{
			ID:              conv.ConversationID.String(),
			LastMessageText: conv.LastMessagePreview,
			UnreadCount:     conv.UnreadCount,
		}

		resp.Type = conv.ConversationType
		resp.Name = conv.DisplayName
		resp.Avatar = conv.DisplayAvatar

		if conv.ConversationType == "direct" && conv.OtherUserID != nil {
			otherUserID, err := uuid.Parse(conv.OtherUserID.String())
			if err == nil {
				if cachedUser, cacheErr := s.userCache.GetUserCache(otherUserID, false); cacheErr == nil && cachedUser != nil {
					resp.Name = cachedUser.Username
					resp.Avatar = cachedUser.Avatar
				}
			}
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

	updatedEntry := &ConversationByUser{
		UserID:             userConv.UserID,
		ConversationID:     userConv.ConversationID,
		ConversationType:   userConv.ConversationType,
		DisplayName:        userConv.DisplayName,
		DisplayAvatar:      userConv.DisplayAvatar,
		OtherUserID:        userConv.OtherUserID,
		OtherUserName:      userConv.OtherUserName,
		OtherUserAvatar:    userConv.OtherUserAvatar,
		LastMessageAt:      userConv.LastMessageAt,
		LastMessageID:      userConv.LastMessageID,
		LastMessagePreview: userConv.LastMessagePreview,
		LastMessageSender:  userConv.LastMessageSender,
		UnreadCount:        0,
		LastReadMessageID:  &lastReadMessageID,
		LastReadAt:         &now,
		UpdatedAt:          &now,
	}

	if err := s.repo.UpdateConversationInUserInbox(userID, conversationID, userConv.LastMessageAt, updatedEntry); err != nil {
		return fmt.Errorf("failed to update conversation inbox: %w", err)
	}

	if err := s.repo.MarkAsRead(conversationID, userID, lastReadMessageID, now); err != nil {
		return fmt.Errorf("failed to mark as read: %w", err)
	}

	go func() {
		s.cache.ResetUnreadCount(conversationID, userID)
		s.InvalidateUserConversationsCache([]uuid.UUID{userID})
	}()

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

func (s *Service) HideConversation(userID, conversationID uuid.UUID) error {
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

	if err := s.repo.HideConversation(userID, conversationID); err != nil {
		return fmt.Errorf("failed to hide conversation: %w", err)
	}

	go func() {
		if err := s.cache.AddHiddenConversation(userID, conversationID); err != nil {
			s.logger.Warnw("Failed to update hidden cache", "user_id", userID, "conversation_id", conversationID, "error", err)
		}
		s.InvalidateUserConversationsCache([]uuid.UUID{userID})
	}()

	return nil
}

func (s *Service) UnhideConversation(userID, conversationID uuid.UUID) error {
	hidden, err := s.repo.GetHiddenConversation(userID, conversationID)
	if err != nil {
		return fmt.Errorf("failed to check hidden status: %w", err)
	}
	if hidden == nil {
		return fmt.Errorf("conversation is not hidden")
	}

	conv, err := s.repo.GetConversationByID(conversationID)
	if err != nil {
		return fmt.Errorf("failed to get conversation: %w", err)
	}

	var conversationType, displayName, displayAvatar string
	var otherUserID *gocql.UUID
	var otherUserName, otherUserAvatar string

	if conv.Type == "direct" {
		conversationType = "direct"
		members, err := s.GetMembersCached(conversationID)
		if err == nil {
			for _, member := range members {
				if member.UserID != userID && member.IsActive {
					if otherUser, userErr := s.userCache.GetUserCache(member.UserID, true); userErr == nil {
						displayName = otherUser.Username
						displayAvatar = otherUser.Avatar
						otherUserName = otherUser.Username
						otherUserAvatar = otherUser.Avatar
						gocqlOtherID, _ := utils.ToGocqlUUID(member.UserID)
						otherUserID = &gocqlOtherID
					}
					break
				}
			}
		}
	} else {
		conversationType = "group"
		displayName = conv.Name
		displayAvatar = conv.Avatar
	}

	newLastMessageAt := gocql.TimeUUID()
	if err := s.repo.UnhideConversation(userID, conversationID, newLastMessageAt, nil, "", nil, 0,
		conversationType, displayName, displayAvatar, otherUserID, otherUserName, otherUserAvatar); err != nil {
		return fmt.Errorf("failed to unhide conversation: %w", err)
	}

	go func() {
		if err := s.cache.RemoveHiddenConversation(userID, conversationID); err != nil {
			s.logger.Warnw("Failed to update hidden cache", "user_id", userID, "conversation_id", conversationID, "error", err)
		}
		s.InvalidateUserConversationsCache([]uuid.UUID{userID})
	}()

	return nil
}

func (s *Service) CheckIfHidden(userID, conversationID uuid.UUID) (bool, error) {
	isHidden, err := s.cache.IsConversationHidden(userID, conversationID)
	if err == nil {
		s.logger.Debugw("Cache HIT for hidden status", "user_id", userID, "conversation_id", conversationID, "hidden", isHidden)
		return isHidden, nil
	}

	s.logger.Debugw("Cache MISS for hidden status", "user_id", userID, "conversation_id", conversationID)
	isHidden, err = s.repo.CheckIfHidden(userID, conversationID)
	if err != nil {
		return false, fmt.Errorf("failed to check hidden status: %w", err)
	}

	go func() {
		if isHidden {
			if err := s.cache.AddHiddenConversation(userID, conversationID); err != nil {
				s.logger.Warnw("Failed to cache hidden status", "user_id", userID, "conversation_id", conversationID, "error", err)
			}
		}
	}()

	return isHidden, nil
}

func (s *Service) AutoUnhideOnNewMessage(userID, conversationID uuid.UUID, messageID gocql.UUID,
	messageBody string, senderID uuid.UUID) error {

	isHidden, err := s.CheckIfHidden(userID, conversationID)
	if err != nil {
		return fmt.Errorf("failed to check hidden status: %w", err)
	}

	if !isHidden {
		return nil
	}

	s.logger.Infow("Auto-unhiding conversation due to new message",
		"user_id", userID, "conversation_id", conversationID, "message_id", messageID)

	conv, err := s.repo.GetConversationByID(conversationID)
	if err != nil {
		return fmt.Errorf("failed to get conversation: %w", err)
	}

	var conversationType, displayName, displayAvatar string
	var otherUserID *gocql.UUID
	var otherUserName, otherUserAvatar string

	if conv.Type == "direct" {
		conversationType = "direct"
		members, membersErr := s.GetMembersCached(conversationID)
		if membersErr == nil {
			for _, member := range members {
				if member.UserID != userID && member.IsActive {
					if otherUser, userErr := s.userCache.GetUserCache(member.UserID, true); userErr == nil {
						displayName = otherUser.Username
						displayAvatar = otherUser.Avatar
						otherUserName = otherUser.Username
						otherUserAvatar = otherUser.Avatar
						gocqlOtherID, _ := utils.ToGocqlUUID(member.UserID)
						otherUserID = &gocqlOtherID
					}
					break
				}
			}
		}
	} else {
		conversationType = "group"
		displayName = conv.Name
		displayAvatar = conv.Avatar
	}

	if err := s.repo.UnhideConversation(userID, conversationID, messageID, &messageID, messageBody, &senderID, 1,
		conversationType, displayName, displayAvatar, otherUserID, otherUserName, otherUserAvatar); err != nil {
		return fmt.Errorf("failed to auto-unhide conversation: %w", err)
	}

	go func() {
		if err := s.cache.RemoveHiddenConversation(userID, conversationID); err != nil {
			s.logger.Warnw("Failed to update hidden cache", "user_id", userID, "conversation_id", conversationID, "error", err)
		}
		s.InvalidateUserConversationsCache([]uuid.UUID{userID})
	}()

	return nil
}

func (s *Service) SendTypingIndicator(userID, conversationID uuid.UUID, isTyping bool) error {
	rateLimitKey := fmt.Sprintf(constants.CacheKeyTypingRateLimit, userID.String(), conversationID.String())

	if isTyping {
		var dummy string
		err := s.cache.cache.Get(rateLimitKey, &dummy)
		if err == nil {
			s.logger.Debugw("Typing indicator rate limited", "user_id", userID, "conversation_id", conversationID)
			return nil
		}

		if err := s.cache.cache.Set(rateLimitKey, "1", 5*time.Second); err != nil {
			s.logger.Warnw("Failed to set rate limit", "error", err)
		}
	}

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

	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	event := &conversationEvents.TypingEvent{
		ConversationID: conversationID.String(),
		UserID:         userID.String(),
		Username:       user.Username,
		Time:           time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := s.kafkaProducer.PublishConversationTyping(ctx, event); err != nil {
		s.logger.Errorw("Failed to publish typing event", "error", err)
		return fmt.Errorf("failed to publish typing event: %w", err)
	}

	s.logger.Debugw("Typing indicator sent", "user_id", userID, "conversation_id", conversationID, "is_typing", isTyping)
	return nil
}
