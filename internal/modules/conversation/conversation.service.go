package conversation

import (
	"chat-server/internal/constants"
	conversationEvents "chat-server/internal/domain/conversation"
	"chat-server/internal/models"
	userModule "chat-server/internal/modules/user"
	"chat-server/internal/transport/kafka"
	"chat-server/internal/transport/websocket"
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
	presence      *websocket.PresenceService
	logger        *zap.SugaredLogger
}

func NewService(
	repo *Repository,
	cache *CacheService,
	userCache *userModule.CacheService,
	db *gorm.DB,
	kafkaProducer *kafka.Producer,
	presence *websocket.PresenceService,
	logger *zap.SugaredLogger,
) *Service {
	return &Service{
		repo:          repo,
		cache:         cache,
		userCache:     userCache,
		db:            db,
		kafkaProducer: kafkaProducer,
		presence:      presence,
		logger:        logger.Named("[conversation_service]"),
	}
}

type userCacheGetter interface {
	GetUserCache(userID uuid.UUID, fallbackToDB bool) (*models.User, error)
}

type ResolvedDisplay struct {
	ConversationType string
	DisplayName      string
	DisplayAvatar    string
	OtherUserID      *gocql.UUID
	OtherUserName    string
	OtherUserAvatar  string
}

func (s *Service) resolveConversationDisplay(conv *Conversation, viewerID uuid.UUID, members []ConversationMember) ResolvedDisplay {
	return ResolveConversationDisplay(conv, viewerID, members, s.userCache)
}

func ResolveConversationDisplay(conv *Conversation, viewerID uuid.UUID, members []ConversationMember, userCache userCacheGetter) ResolvedDisplay {
	if conv.Type == constants.ConversationTypeDirect {
		for _, m := range members {
			if m.UserID == viewerID || !m.IsActive {
				continue
			}
			if otherUser, err := userCache.GetUserCache(m.UserID, true); err == nil {
				name := otherUser.FullName
				if name == "" {
					name = otherUser.Username
				}
				gocqlID, _ := utils.ToGocqlUUID(m.UserID)
				return ResolvedDisplay{
					ConversationType: constants.ConversationTypeDirect,
					DisplayName:      name,
					DisplayAvatar:    otherUser.Avatar,
					OtherUserID:      &gocqlID,
					OtherUserName:    name,
					OtherUserAvatar:  otherUser.Avatar,
				}
			}
			break
		}
		return ResolvedDisplay{ConversationType: constants.ConversationTypeDirect}
	}
	return ResolvedDisplay{
		ConversationType: constants.ConversationTypeGroupDB,
		DisplayName:      conv.Name,
		DisplayAvatar:    conv.Avatar,
	}
}

func requireActiveMember(members []ConversationMember, userID uuid.UUID) bool {
	for _, m := range members {
		if m.UserID == userID && m.IsActive {
			return true
		}
	}
	return false
}

func displayName(u *models.User) string {
	if u.FullName != "" {
		return u.FullName
	}
	return u.Username
}

func (s *Service) buildConversationResponse(conv ConversationByUser, viewerID uuid.UUID, otherLastRead *gocql.UUID) ConversationResponse {
	resp := ConversationResponse{
		ID:              conv.ConversationID.String(),
		Type:            conv.ConversationType,
		Name:            conv.DisplayName,
		Avatar:          conv.DisplayAvatar,
		LastMessageText: conv.LastMessagePreview,
		UnreadCount:     conv.UnreadCount,
		IsMuted:         conv.IsMuted,
		LastMessageAt:   conv.LastMessageAt.Time().Format(time.RFC3339),
	}

	if conv.ConversationType == constants.ConversationTypeDirect && conv.OtherUserID != nil {
		if otherUserID, err := uuid.Parse(conv.OtherUserID.String()); err == nil {
			u, err := s.userCache.GetUserCache(otherUserID, true)
			if err != nil || u == nil {
				s.logger.Warnw("buildConversationResponse: failed to fetch other user",
					"conversation_id", conv.ConversationID, "other_user_id", otherUserID, "error", err)
			} else {
				resp.Name = displayName(u)
				resp.Avatar = u.Avatar
				resp.OtherUser = &OtherUserBrief{
					ID:       otherUserID.String(),
					Username: u.Username,
					FullName: u.FullName,
					Avatar:   u.Avatar,
					Bio:      u.Bio,
				}
			}
		}
	} else if conv.ConversationType == constants.ConversationTypeDirect {
		s.logger.Warnw("Direct conversation missing OtherUserID",
			"conversation_id", conv.ConversationID, "viewer_id", viewerID)
	}

	if conv.LastMessageSender != nil {
		senderIDStr := conv.LastMessageSender.String()
		resp.LastMessageSenderID = senderIDStr
		resp.IsLastMessageFromMe = senderIDStr == viewerID.String()
		if senderUUID, err := uuid.Parse(senderIDStr); err == nil {
			if u, err := s.userCache.GetUserCache(senderUUID, false); err == nil && u != nil {
				resp.LastMessageSenderName = displayName(u)
			}
		}
	}

	if conv.LastMessageID == nil {
		resp.Seen = true
	} else if resp.IsLastMessageFromMe {
		if otherLastRead != nil {
			resp.Seen = *otherLastRead == *conv.LastMessageID
		}
	} else {
		resp.Seen = conv.LastReadMessageID != nil && *conv.LastReadMessageID == *conv.LastMessageID
	}

	return resp
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

	displayName := otherUser.FullName
	if displayName == "" {
		displayName = otherUser.Username
	}

	if existingConvID == nil {
		return &ConversationResponse{
			ID:               "",
			Type:             constants.ConversationTypeDirect,
			Name:             displayName,
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
		Type:             constants.ConversationTypeDirect,
		Name:             displayName,
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
		otherUserDisplayName := otherUser.FullName
		if otherUserDisplayName == "" {
			otherUserDisplayName = otherUser.Username
		}
		return &ConversationResponse{
			ID:               existingConvID.String(),
			Type:             constants.ConversationTypeDirect,
			Name:             otherUserDisplayName,
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
		Type:             constants.ConversationTypeDirect,
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
		Role:           constants.MemberRoleDefault,
	}
	member2 := &ConversationMember{
		ConversationID: conversationID,
		UserID:         user2ID,
		JoinedAt:       now,
		IsActive:       true,
		Role:           constants.MemberRoleDefault,
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

	otherUserDisplayName := otherUser.FullName
	if otherUserDisplayName == "" {
		otherUserDisplayName = otherUser.Username
	}
	user1DisplayName := user1.FullName
	if user1DisplayName == "" {
		user1DisplayName = user1.Username
	}

	inbox1 := &ConversationByUser{
		UserID:           gocqlUser1ID,
		ConversationID:   gocqlConvID,
		ConversationType: constants.ConversationTypeDirect,
		DisplayName:      otherUserDisplayName,
		DisplayAvatar:    otherUser.Avatar,
		OtherUserID:      &gocqlUser2ID,
		OtherUserName:    otherUserDisplayName,
		OtherUserAvatar:  otherUser.Avatar,
		LastMessageAt:    lastMessageAt,
		UnreadCount:      0,
		UpdatedAt:        &now,
	}
	inbox2 := &ConversationByUser{
		UserID:           gocqlUser2ID,
		ConversationID:   gocqlConvID,
		ConversationType: constants.ConversationTypeDirect,
		DisplayName:      user1DisplayName,
		DisplayAvatar:    user1.Avatar,
		OtherUserID:      &gocqlUser1ID,
		OtherUserName:    user1DisplayName,
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
		s.publishDirectConversationCreated(conversationID, user1ID, user2ID, user1, otherUser, now)
	}()

	otherUserResponseName := otherUser.FullName
	if otherUserResponseName == "" {
		otherUserResponseName = otherUser.Username
	}

	return &ConversationResponse{
		ID:               conversationID.String(),
		Type:             constants.ConversationTypeDirect,
		Name:             otherUserResponseName,
		Avatar:           otherUser.Avatar,
		CreatedAt:        now.Format(time.RFC3339),
		UpdatedAt:        now.Format(time.RFC3339),
		ParticipantCount: 2,
		IsNew:            true,
	}, nil
}

func (s *Service) publishDirectConversationCreated(convID, user1ID, user2ID uuid.UUID, user1, user2 *models.User, createdAt time.Time) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	user1Name := user1.FullName
	if user1Name == "" {
		user1Name = user1.Username
	}
	user2Name := user2.FullName
	if user2Name == "" {
		user2Name = user2.Username
	}

	participants := []map[string]interface{}{
		{"userId": user1ID.String(), "username": user1.Username, "avatar": user1.Avatar},
		{"userId": user2ID.String(), "username": user2.Username, "avatar": user2.Avatar},
	}

	createdAtStr := createdAt.Format(time.RFC3339)

	user1Event := &conversationEvents.CreatedEvent{
		ConversationID: convID.String(),
		Data: map[string]interface{}{
			"id":               convID.String(),
			"type":             constants.ConversationTypeDirect,
			"name":             user2Name,
			"avatar":           user2.Avatar,
			"createdAt":        createdAtStr,
			"updatedAt":        createdAtStr,
			"participantCount": 2,
			"unreadCount":      0,
			"participants":     participants,
		},
	}
	user2Event := &conversationEvents.CreatedEvent{
		ConversationID: convID.String(),
		Data: map[string]interface{}{
			"id":               convID.String(),
			"type":             constants.ConversationTypeDirect,
			"name":             user1Name,
			"avatar":           user1.Avatar,
			"createdAt":        createdAtStr,
			"updatedAt":        createdAtStr,
			"participantCount": 2,
			"unreadCount":      0,
			"participants":     participants,
		},
	}

	if err := s.kafkaProducer.PublishConversationCreated(ctx, user1Event); err != nil {
		s.logger.Errorw("Failed to publish CONVERSATION_CREATED for user1", "conversation_id", convID, "error", err)
	}
	if err := s.kafkaProducer.PublishConversationCreated(ctx, user2Event); err != nil {
		s.logger.Errorw("Failed to publish CONVERSATION_CREATED for user2", "conversation_id", convID, "error", err)
	}
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

	participantIDsToCheck := make([]uuid.UUID, 0, len(uniqueParticipants))
	for participantID := range uniqueParticipants {
		participantIDsToCheck = append(participantIDsToCheck, participantID)
	}
	usersFound := s.userCache.GetUsersBatch(participantIDsToCheck, true)
	for _, pid := range participantIDsToCheck {
		if u, ok := usersFound[pid]; !ok || u == nil {
			return nil, fmt.Errorf("participant %s not found", pid)
		}
	}

	now := time.Now()
	conversationID := uuid.New()
	lastMessageAt := gocql.TimeUUID()

	batch := s.repo.NewBatch()

	conv := &Conversation{
		ConversationID:   conversationID,
		Type:             constants.ConversationTypeGroupDB,
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

		role := constants.MemberRoleDefault
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
			ConversationType: constants.ConversationTypeGroupDB,
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
		s.publishGroupConversationCreated(conversationID, name, allParticipantIDs, now)
	}()

	return &ConversationResponse{
		ID:               conversationID.String(),
		Type:             constants.ConversationTypeGroupDB,
		Name:             name,
		CreatedAt:        now.Format(time.RFC3339),
		UpdatedAt:        now.Format(time.RFC3339),
		ParticipantCount: len(uniqueParticipants),
		IsNew:            true,
	}, nil
}

func (s *Service) publishGroupConversationCreated(convID uuid.UUID, name string, participantIDs []uuid.UUID, createdAt time.Time) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	usersMap := s.userCache.GetUsersBatch(participantIDs, true)
	participants := make([]map[string]interface{}, 0, len(participantIDs))
	for _, pid := range participantIDs {
		u, ok := usersMap[pid]
		if !ok || u == nil {
			continue
		}
		participants = append(participants, map[string]interface{}{
			"userId":   pid.String(),
			"username": u.Username,
			"avatar":   u.Avatar,
		})
	}

	createdAtStr := createdAt.Format(time.RFC3339)

	for _, pid := range participantIDs {
		event := &conversationEvents.CreatedEvent{
			ConversationID: convID.String(),
			Data: map[string]interface{}{
				"id":               convID.String(),
				"type":             constants.ConversationTypeGroupDB,
				"name":             name,
				"createdAt":        createdAtStr,
				"updatedAt":        createdAtStr,
				"participantCount": len(participantIDs),
				"unreadCount":      0,
				"participants":     participants,
			},
		}
		if err := s.kafkaProducer.PublishConversationCreated(ctx, event); err != nil {
			s.logger.Errorw("Failed to publish CONVERSATION_CREATED for group participant",
				"conversation_id", convID, "user_id", pid, "error", err)
		}
	}
}

func (s *Service) GetUserConversations(userID uuid.UUID, limit int) (*ConversationsListResponse, error) {
	conversations, err := s.repo.GetUserConversations(userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get user conversations: %w", err)
	}

	otherReadPairs := make([]OtherUserReadState, 0)
	otherReads := make(map[string]*gocql.UUID)
	for _, conv := range conversations {
		if conv.ConversationType == constants.ConversationTypeDirect &&
			conv.OtherUserID != nil &&
			conv.LastMessageSender != nil &&
			conv.LastMessageSender.String() == userID.String() {
			otherUUID, err := uuid.Parse(conv.OtherUserID.String())
			if err != nil {
				continue
			}
			convUUID, err := uuid.Parse(conv.ConversationID.String())
			if err != nil {
				continue
			}
			key := otherUUID.String() + ":" + convUUID.String()
			if cachedMsgID, cacheErr := s.cache.GetLastRead(convUUID, otherUUID); cacheErr == nil && cachedMsgID != "" {
				gocqlMsgID, parseErr := gocql.ParseUUID(cachedMsgID)
				if parseErr == nil {
					otherReads[key] = &gocqlMsgID
					continue
				}
			}
			otherReadPairs = append(otherReadPairs, OtherUserReadState{
				UserID:         otherUUID,
				ConversationID: convUUID,
			})
		}
	}
	if len(otherReadPairs) > 0 {
		dbReads, err := s.repo.GetOtherUsersLastRead(otherReadPairs)
		if err != nil {
			s.logger.Warnw("Failed to fetch other users last read", "error", err)
		} else {
			for k, v := range dbReads {
				otherReads[k] = v
			}
			go func() {
				for _, p := range otherReadPairs {
					key := p.UserID.String() + ":" + p.ConversationID.String()
					if msgID, ok := dbReads[key]; ok && msgID != nil {
						s.cache.SetLastRead(p.ConversationID, p.UserID, msgID.String())
					}
				}
			}()
		}
	}

	responses := make([]ConversationResponse, 0, len(conversations))
	for _, conv := range conversations {
		var otherLastRead *gocql.UUID
		if conv.ConversationType == constants.ConversationTypeDirect && conv.OtherUserID != nil {
			if otherUUID, err := uuid.Parse(conv.OtherUserID.String()); err == nil {
				if convUUID, err := uuid.Parse(conv.ConversationID.String()); err == nil {
					otherLastRead = otherReads[otherUUID.String()+":"+convUUID.String()]
				}
			}
		}
		responses = append(responses, s.buildConversationResponse(conv, userID, otherLastRead))
	}

	if s.presence != nil {
		otherIDs := make([]string, 0, len(responses))
		seen := make(map[string]bool, len(responses))
		for _, r := range responses {
			if r.OtherUser != nil && !seen[r.OtherUser.ID] {
				otherIDs = append(otherIDs, r.OtherUser.ID)
				seen[r.OtherUser.ID] = true
			}
		}
		if len(otherIDs) > 0 {
			online := s.presence.GetOnlineUsers(otherIDs)
			lastActive := s.presence.GetLastActiveBatch(otherIDs)
			for i := range responses {
				if responses[i].OtherUser == nil {
					continue
				}
				oid := responses[i].OtherUser.ID
				isOnline, lastActiveOut := utils.ApplyOnlineGrace(online[oid], lastActive[oid])
				responses[i].OtherUser.IsOnline = isOnline
				responses[i].OtherUser.LastActiveAt = lastActiveOut
			}
		}
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
	if !requireActiveMember(members, userID) {
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

	if err := s.repo.UpdateConversationInUserInbox(userID, conversationID, updatedEntry); err != nil {
		return fmt.Errorf("failed to update conversation inbox: %w", err)
	}

	if err := s.repo.MarkAsRead(conversationID, userID, lastReadMessageID, now); err != nil {
		return fmt.Errorf("failed to mark as read: %w", err)
	}

	go func() {
		s.cache.ResetUnreadCount(conversationID, userID)
		s.cache.SetLastRead(conversationID, userID, lastReadMessageID.String())
		s.InvalidateUserConversationsCache([]uuid.UUID{userID})
	}()

	if userConv.LastMessageSender != nil && userConv.OtherUserID != nil {
		senderID := *userConv.LastMessageSender
		otherUserID := *userConv.OtherUserID
		if senderID != gocql.UUID(userID) && senderID == otherUserID {
			event := &conversationEvents.UpdatedEvent{
				ConversationID: conversationID.String(),
				Data: map[string]interface{}{
					"id":   conversationID.String(),
					"seen": true,
				},
			}
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := s.kafkaProducer.PublishConversationUpdated(ctx, event); err != nil {
				s.logger.Warnw("Failed to publish conversation updated event for seen", "error", err)
			}
		}
	}

	return nil
}

func (s *Service) GetMembersCached(conversationID uuid.UUID) ([]ConversationMember, error) {
	return s.cache.GetMembersCached(conversationID)
}

func (s *Service) GetConversationByIDCached(conversationID uuid.UUID) (*Conversation, error) {
	return s.cache.GetConversationByIDCached(conversationID)
}

func (s *Service) GetUserConversationsCached(userID uuid.UUID, limit int) ([]ConversationByUser, error) {
	return s.cache.GetUserConversationsCached(userID, limit)
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

func (s *Service) SetConversationMuted(userID, conversationID uuid.UUID, muted bool) error {
	members, err := s.GetMembersCached(conversationID)
	if err != nil {
		return fmt.Errorf("failed to get members: %w", err)
	}
	if !requireActiveMember(members, userID) {
		return fmt.Errorf("user is not a member of this conversation")
	}

	if err := s.repo.SetMuted(userID, conversationID, muted); err != nil {
		return fmt.Errorf("failed to set mute state: %w", err)
	}

	go s.InvalidateUserConversationsCache([]uuid.UUID{userID})
	return nil
}

func (s *Service) HideConversation(userID, conversationID uuid.UUID) error {
	members, err := s.GetMembersCached(conversationID)
	if err != nil {
		return fmt.Errorf("failed to get members: %w", err)
	}
	if !requireActiveMember(members, userID) {
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

	members, _ := s.GetMembersCached(conversationID)
	d := s.resolveConversationDisplay(conv, userID, members)

	newLastMessageAt := gocql.TimeUUID()
	if err := s.repo.UnhideConversation(userID, conversationID, newLastMessageAt, nil, "", nil,
		d.ConversationType, d.DisplayName, d.DisplayAvatar, d.OtherUserID, d.OtherUserName, d.OtherUserAvatar, 0); err != nil {
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
	return s.cache.CheckIfHiddenCached(userID, conversationID)
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

	members, _ := s.GetMembersCached(conversationID)
	d := s.resolveConversationDisplay(conv, userID, members)

	unreadAfter := 0
	if userID != senderID {
		unreadAfter = 1
	}

	if err := s.repo.UnhideConversation(userID, conversationID, messageID, &messageID, messageBody, &senderID,
		d.ConversationType, d.DisplayName, d.DisplayAvatar, d.OtherUserID, d.OtherUserName, d.OtherUserAvatar, unreadAfter); err != nil {
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
	if isTyping {
		if s.cache.IsTypingRateLimited(userID, conversationID) {
			s.logger.Debugw("Typing indicator rate limited", "user_id", userID, "conversation_id", conversationID)
			return nil
		}
		s.cache.SetTypingRateLimit(userID, conversationID)
	}

	members, err := s.GetMembersCached(conversationID)
	if err != nil {
		return fmt.Errorf("failed to get members: %w", err)
	}

	if !requireActiveMember(members, userID) {
		return fmt.Errorf("user is not a member of this conversation")
	}

	u, err := s.userCache.GetUserCache(userID, true)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	event := &conversationEvents.TypingEvent{
		ConversationID: conversationID.String(),
		UserID:         userID.String(),
		Username:       u.Username,
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

func (s *Service) GetConversationDetail(userID, conversationID uuid.UUID) (*ConversationResponse, error) {
	conv, err := s.repo.GetUserConversationByID(userID, conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation: %w", err)
	}
	if conv == nil {
		return nil, fmt.Errorf("conversation not found")
	}

	var otherLastRead *gocql.UUID
	if conv.ConversationType == constants.ConversationTypeDirect && conv.OtherUserID != nil {
		if otherUUID, err := uuid.Parse(conv.OtherUserID.String()); err == nil {
			otherLastRead, _, _ = s.repo.GetReadStatus(conversationID, otherUUID)
		}
	}

	resp := s.buildConversationResponse(*conv, userID, otherLastRead)
	resp.ParticipantCount = 0

	if conv.ConversationType == constants.ConversationTypeDirect && conv.OtherUserID != nil && resp.OtherUser != nil {
		if otherUserID, err := uuid.Parse(conv.OtherUserID.String()); err == nil && s.presence != nil {
			rawOnline := s.presence.IsUserOnline(otherUserID.String())
			rawLastActive := s.presence.GetLastActive(otherUserID.String())
			resp.OtherUser.IsOnline, resp.OtherUser.LastActiveAt = utils.ApplyOnlineGrace(rawOnline, rawLastActive)
		}
	}

	if members, merr := s.GetMembersCached(conversationID); merr == nil {
		resp.ParticipantCount = len(members)
	}

	return &resp, nil
}
