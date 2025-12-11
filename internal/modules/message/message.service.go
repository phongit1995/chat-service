package message

import (
	conversationEvents "chat-server/internal/domain/conversation"
	messageEvents "chat-server/internal/domain/message"
	"chat-server/internal/infra/kafka"
	"chat-server/internal/models"
	"chat-server/internal/modules/conversation"
	userModule "chat-server/internal/modules/user"
	"chat-server/internal/utils"
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/gocql/gocql"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type Service struct {
	repo          *Repository
	cache         *CacheService
	convRepo      *conversation.Repository
	convCache     *conversation.CacheService
	userCache     *userModule.CacheService
	db            *gorm.DB
	kafkaProducer *kafka.Producer
	logger        *zap.SugaredLogger
}

func NewService(repo *Repository, cache *CacheService, convRepo *conversation.Repository, convCache *conversation.CacheService, userCache *userModule.CacheService, db *gorm.DB, kafkaProducer *kafka.Producer, logger *zap.SugaredLogger) *Service {
	return &Service{
		repo:          repo,
		cache:         cache,
		convRepo:      convRepo,
		convCache:     convCache,
		userCache:     userCache,
		db:            db,
		kafkaProducer: kafkaProducer,
		logger:        logger.Named("[message_service]"),
	}
}

func (s *Service) SendDirectMessage(senderID, recipientID uuid.UUID, messageType, content, metadata string) (*MessageResponse, error) {
	userA, userB := senderID, recipientID
	if senderID.String() > recipientID.String() {
		userA, userB = recipientID, senderID
	}

	conversationID, isNew, err := s.convRepo.GetOrCreateDirectConversation(userA, userB)
	if err != nil {
		return nil, fmt.Errorf("failed to get/create conversation: %w", err)
	}

	if isNew {
		if err := s.createFullDirectConversation(senderID, recipientID, conversationID); err != nil {
			return nil, fmt.Errorf("failed to create full conversation structure: %w", err)
		}
		s.logger.Infow("Created new direct conversation with full structure", "conversation_id", conversationID)
	}

	messageResponse, err := s.SendMessage(senderID, conversationID, messageType, content, metadata, nil)
	if err != nil {
		return nil, err
	}

	if isNew {
		go s.publishConversationCreatedEvent(conversationID, senderID, recipientID, messageResponse)
	}

	return messageResponse, nil
}

func (s *Service) createFullDirectConversation(user1ID, user2ID, conversationID uuid.UUID) error {
	user1, err := s.userCache.GetUserCache(user1ID, true)
	if err != nil {
		return fmt.Errorf("user1 not found: %w", err)
	}
	user2, err := s.userCache.GetUserCache(user2ID, true)
	if err != nil {
		return fmt.Errorf("user2 not found: %w", err)
	}

	now := time.Now()
	lastMessageAt := gocql.TimeUUID()

	batch := s.convRepo.NewBatch()

	conv := &conversation.Conversation{
		ConversationID:   conversationID,
		Type:             "direct",
		Name:             "",
		Avatar:           "",
		CreatedBy:        user1ID,
		CreatedAt:        now,
		UpdatedAt:        now,
		ParticipantCount: 2,
	}
	s.convRepo.AddConversationToBatch(batch, conv)

	member1 := &conversation.ConversationMember{
		ConversationID: conversationID,
		UserID:         user1ID,
		JoinedAt:       now,
		IsActive:       true,
		Role:           "member",
	}
	member2 := &conversation.ConversationMember{
		ConversationID: conversationID,
		UserID:         user2ID,
		JoinedAt:       now,
		IsActive:       true,
		Role:           "member",
	}
	s.convRepo.AddMemberToBatch(batch, member1)
	s.convRepo.AddMemberToBatch(batch, member2)

	gocqlUser1ID, err := utils.ToGocqlUUID(user1ID)
	if err != nil {
		return fmt.Errorf("failed to convert user1ID: %w", err)
	}
	gocqlUser2ID, err := utils.ToGocqlUUID(user2ID)
	if err != nil {
		return fmt.Errorf("failed to convert user2ID: %w", err)
	}
	gocqlConvID, err := utils.ToGocqlUUID(conversationID)
	if err != nil {
		return fmt.Errorf("failed to convert conversationID: %w", err)
	}

	inbox1 := &conversation.ConversationByUser{
		UserID:           gocqlUser1ID,
		ConversationID:   gocqlConvID,
		ConversationType: "direct",
		DisplayName:      user2.Username,
		DisplayAvatar:    user2.Avatar,
		OtherUserID:      &gocqlUser2ID,
		OtherUserName:    user2.Username,
		OtherUserAvatar:  user2.Avatar,
		LastMessageAt:    lastMessageAt,
		UnreadCount:      0,
		UpdatedAt:        &now,
	}
	inbox2 := &conversation.ConversationByUser{
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
	s.convRepo.AddConversationToUserInboxBatch(batch, inbox1)
	s.convRepo.AddConversationToUserInboxBatch(batch, inbox2)

	if err := s.convRepo.ExecuteBatch(batch); err != nil {
		return fmt.Errorf("failed to execute batch: %w", err)
	}

	members := []conversation.ConversationMember{*member1, *member2}

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		s.convCache.InvalidateUserConversations([]uuid.UUID{user1ID, user2ID})
	}()
	go func() {
		defer wg.Done()
		if err := s.convCache.SetConversationMembers(conversationID, members); err != nil {
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
	wg.Wait()

	return nil
}

func (s *Service) SendMessage(senderID, conversationID uuid.UUID, messageType, content, metadata string, replyToID *uuid.UUID) (*MessageResponse, error) {
	_, err := s.getConversationByIDCached(conversationID)
	if err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	members, err := s.getMembersCached(conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get members: %w", err)
	}

	isMember := false
	for _, m := range members {
		if m.UserID == senderID && m.IsActive {
			isMember = true
			break
		}
	}

	if !isMember {
		return nil, fmt.Errorf("user is not a member of this conversation")
	}

	now := time.Now()
	messageID := gocql.TimeUUID()

	senderInfo, err := s.userCache.GetUserCache(senderID, true)
	if err != nil {
		return nil, fmt.Errorf("failed to get sender info: %w", err)
	}

	msg := &Message{
		ConversationID: conversationID,
		MessageID:      messageID,
		SenderID:       senderID,
		SenderName:     senderInfo.Username,
		SenderAvatar:   senderInfo.Avatar,
		MessageType:    messageType,
		Content:        content,
		Metadata:       metadata,
		CreatedAt:      now,
		UpdatedAt:      now,
		ReplyToID:      replyToID,
	}

	if err := s.repo.CreateMessage(msg); err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	shortContent := content
	if len(shortContent) > 100 {
		shortContent = shortContent[:100] + "..."
	}

	memberIDs := make([]uuid.UUID, 0, len(members))

	const maxWorkers = 10
	semaphore := make(chan struct{}, maxWorkers)
	var wg sync.WaitGroup
	var errMux sync.Mutex
	var firstError error

	for _, member := range members {
		if !member.IsActive {
			continue
		}

		memberIDs = append(memberIDs, member.UserID)

		wg.Add(1)
		semaphore <- struct{}{}
		go func(m conversation.ConversationMember) {
			defer func() {
				<-semaphore
				wg.Done()
			}()

			inboxEntry, oldLastMessageAt, err := s.repo.GetConversationInboxEntry(m.UserID, conversationID)
			if err != nil {
				s.logger.Errorw("Failed to get inbox entry", "user_id", m.UserID, "error", err)
				errMux.Lock()
				if firstError == nil {
					firstError = fmt.Errorf("inbox entry not found for user %s", m.UserID)
				}
				errMux.Unlock()
				return
			}

			if inboxEntry == nil {
				isHidden, checkErr := s.convRepo.CheckIfHidden(m.UserID, conversationID)
				if checkErr != nil {
					s.logger.Errorw("Failed to check hidden status", "user_id", m.UserID, "conversation_id", conversationID, "error", checkErr)
					errMux.Lock()
					if firstError == nil {
						firstError = fmt.Errorf("failed to check hidden status for user %s", m.UserID)
					}
					errMux.Unlock()
					return
				}

				if isHidden {
					s.logger.Infow("Auto-unhiding conversation due to new message",
						"user_id", m.UserID, "conversation_id", conversationID, "message_id", messageID)

					conv, convErr := s.getConversationByIDCached(conversationID)
					if convErr != nil {
						s.logger.Errorw("Failed to get conversation for unhide", "conversation_id", conversationID, "error", convErr)
						errMux.Lock()
						if firstError == nil {
							firstError = fmt.Errorf("failed to get conversation for unhide: %w", convErr)
						}
						errMux.Unlock()
						return
					}

					var conversationType, displayName, displayAvatar string
					var otherUserID *gocql.UUID
					var otherUserName, otherUserAvatar string

					if conv.Type == "direct" {
						conversationType = "direct"
						for _, member := range members {
							if member.UserID != m.UserID && member.IsActive {
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
					} else {
						conversationType = "group"
						displayName = conv.Name
						displayAvatar = conv.Avatar
					}

					unreadCount := 0
					if m.UserID != senderID {
						unreadCount = 1
					}

					if unhideErr := s.convRepo.UnhideConversation(m.UserID, conversationID, messageID,
						&messageID, shortContent, &senderID, unreadCount,
						conversationType, displayName, displayAvatar, otherUserID, otherUserName, otherUserAvatar); unhideErr != nil {
						s.logger.Errorw("Failed to auto-unhide conversation", "user_id", m.UserID, "error", unhideErr)
						errMux.Lock()
						if firstError == nil {
							firstError = fmt.Errorf("failed to auto-unhide conversation for user %s", m.UserID)
						}
						errMux.Unlock()
						return
					}

					go func(uid uuid.UUID) {
						if cacheErr := s.convCache.RemoveHiddenConversation(uid, conversationID); cacheErr != nil {
							s.logger.Warnw("Failed to update hidden cache after auto-unhide",
								"user_id", uid, "conversation_id", conversationID, "error", cacheErr)
						}
					}(m.UserID)

					return
				}

				s.logger.Warnw("Inbox entry missing, attempting to recreate", "user_id", m.UserID, "conversation_id", conversationID)

				if recreateErr := s.recreateInboxEntry(m.UserID, conversationID, messageID, shortContent, senderID, m.UserID != senderID); recreateErr != nil {
					s.logger.Errorw("Failed to recreate inbox entry", "user_id", m.UserID, "conversation_id", conversationID, "error", recreateErr)
					errMux.Lock()
					if firstError == nil {
						firstError = fmt.Errorf("failed to recreate inbox entry for user %s: %w", m.UserID, recreateErr)
					}
					errMux.Unlock()
				} else {
					s.logger.Infow("Successfully recreated inbox entry", "user_id", m.UserID, "conversation_id", conversationID)
				}
				return
			}

			newUnreadCount := inboxEntry.UnreadCount
			if m.UserID != senderID {
				newUnreadCount++
			}

			displayName := inboxEntry.DisplayName
			displayAvatar := inboxEntry.DisplayAvatar
			otherUserName := inboxEntry.OtherUserName
			otherUserAvatar := inboxEntry.OtherUserAvatar

			if inboxEntry.ConversationType == "direct" && inboxEntry.OtherUserID != nil {
				otherUserID, err := uuid.Parse(inboxEntry.OtherUserID.String())
				if err == nil {
					if cachedUser, cacheErr := s.userCache.GetUserCache(otherUserID, false); cacheErr == nil && cachedUser != nil {
						displayName = cachedUser.Username
						displayAvatar = cachedUser.Avatar
						otherUserName = cachedUser.Username
						otherUserAvatar = cachedUser.Avatar
					}
				}
			}

			nowTime := time.Now()
			updatedEntry := &ConversationInboxUpdate{
				UserID:             m.UserID,
				ConversationID:     conversationID,
				ConversationType:   inboxEntry.ConversationType,
				DisplayName:        displayName,
				DisplayAvatar:      displayAvatar,
				OtherUserID:        inboxEntry.OtherUserID,
				OtherUserName:      otherUserName,
				OtherUserAvatar:    otherUserAvatar,
				LastMessageAt:      messageID,
				LastMessageID:      &messageID,
				LastMessagePreview: shortContent,
				LastMessageSender:  &senderID,
				UnreadCount:        newUnreadCount,
				LastReadMessageID:  inboxEntry.LastReadMessageID,
				LastReadAt:         inboxEntry.LastReadAt,
				UpdatedAt:          &nowTime,
			}

			if err := s.updateConversationWithRetry(m.UserID, *oldLastMessageAt, conversationID, updatedEntry, 3); err != nil {
				s.logger.Errorw("Failed to update conversation after retries", "user_id", m.UserID, "error", err)
				errMux.Lock()
				if firstError == nil {
					firstError = fmt.Errorf("failed to update inbox for user %s: %w", m.UserID, err)
				}
				errMux.Unlock()
				return
			}

			go func(uid uuid.UUID, convID uuid.UUID, keepLastMessageAt gocql.UUID) {
				time.Sleep(2 * time.Second)
				if cleanupErr := s.convCache.DeleteUserConversations(uid); cleanupErr != nil {
					s.logger.Debugw("Cleanup cache after update", "user_id", uid)
				}
			}(m.UserID, conversationID, messageID)
		}(member)
	}

	wg.Wait()

	if firstError != nil {
		return nil, firstError
	}

	response := &MessageResponse{
		ID:             messageID.String(),
		ConversationID: conversationID.String(),
		SenderID:       senderID.String(),
		SenderName:     senderInfo.Username,
		SenderAvatar:   senderInfo.Avatar,
		Type:           messageType,
		Content:        content,
		Metadata:       metadata,
		CreatedAt:      now.Format(time.RFC3339),
		UpdatedAt:      now.Format(time.RFC3339),
	}

	if replyToID != nil {
		response.ReplyToID = replyToID.String()
	}

	var sender models.User
	if err := s.db.First(&sender, "id = ?", senderID).Error; err == nil {
		response.SenderName = sender.Username
		response.SenderAvatar = sender.Avatar
	}

	if err := s.cache.SetMessage(msg); err != nil {
		s.logger.Warnw("Failed to cache message", "message_id", messageID, "error", err)
	}

	go s.invalidateCachesAfterSend(conversationID, memberIDs)

	responseCopy := *response
	conversationIDCopy := conversationID

	go func(resp MessageResponse, convID uuid.UUID) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		conv, err := s.getConversationByIDCached(convID)
		var convData *messageEvents.ConversationData
		if err == nil && conv != nil {
			convData = &messageEvents.ConversationData{
				ID:               conv.ConversationID.String(),
				Type:             conv.Type,
				Name:             conv.Name,
				Avatar:           conv.Avatar,
				CreatedAt:        conv.CreatedAt.Format(time.RFC3339),
				UpdatedAt:        conv.UpdatedAt.Format(time.RFC3339),
				ParticipantCount: conv.ParticipantCount,
			}
		}

		messageData := &messageEvents.MessageData{
			ID:             resp.ID,
			ConversationID: resp.ConversationID,
			SenderID:       resp.SenderID,
			SenderName:     resp.SenderName,
			SenderAvatar:   resp.SenderAvatar,
			Type:           resp.Type,
			Content:        resp.Content,
			Metadata:       resp.Metadata,
			CreatedAt:      resp.CreatedAt,
			UpdatedAt:      resp.UpdatedAt,
			ReplyToID:      resp.ReplyToID,
		}

		event := &messageEvents.MessageCreatedEvent{
			Conversation: convData,
			Message:      messageData,
		}
		if err := s.kafkaProducer.PublishMessageCreated(ctx, event); err != nil {
			s.logger.Errorw("Failed to publish message created event", "error", err)
		}
	}(responseCopy, conversationIDCopy)

	return response, nil
}

func (s *Service) GetMessages(userID, conversationID uuid.UUID, limit int, beforeMessageID *string) (*MessagesListResponse, error) {
	members, err := s.getMembersCached(conversationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get members: %w", err)
	}

	isMember := false
	for _, m := range members {
		if m.UserID == userID && m.IsActive {
			isMember = true
			break
		}
	}

	if !isMember {
		return nil, fmt.Errorf("user is not a member of this conversation")
	}

	var beforeTimeuuid *gocql.UUID
	if beforeMessageID != nil && *beforeMessageID != "" {
		parsed, err := gocql.ParseUUID(*beforeMessageID)
		if err != nil {
			return nil, fmt.Errorf("invalid beforeMessageID: %w", err)
		}
		beforeTimeuuid = &parsed
	}

	var messages []Message
	if beforeTimeuuid == nil {
		if cached, err := s.cache.GetConversationMessages(conversationID, limit); err == nil && len(cached) > 0 {
			s.logger.Debugw("Cache HIT for messages", "conversation_id", conversationID)
			messages = cached
		}
	}

	if len(messages) == 0 {
		s.logger.Debugw("Cache MISS for messages", "conversation_id", conversationID)
		messages, err = s.repo.GetMessages(conversationID, limit, beforeTimeuuid)
		if err != nil {
			return nil, fmt.Errorf("failed to get messages: %w", err)
		}

		if beforeTimeuuid == nil && len(messages) > 0 {
			go func() {
				if err := s.cache.SetConversationMessages(conversationID, limit, messages); err != nil {
					s.logger.Warnw("Failed to cache messages", "conversation_id", conversationID, "error", err)
				}
			}()
		}
	}

	senderIDs := make([]uuid.UUID, 0)
	senderMap := make(map[uuid.UUID]bool)
	for _, msg := range messages {
		if !senderMap[msg.SenderID] {
			senderIDs = append(senderIDs, msg.SenderID)
			senderMap[msg.SenderID] = true
		}
	}

	var users []models.User
	if len(senderIDs) > 0 {
		if err := s.db.Where("id IN ?", senderIDs).Find(&users).Error; err != nil {
			s.logger.Warnw("Failed to fetch users", "error", err)
		}
	}

	userInfoMap := make(map[uuid.UUID]models.User)
	for _, user := range users {
		userInfoMap[user.ID] = user
	}

	responses := make([]MessageResponse, 0, len(messages))
	for _, msg := range messages {
		if msg.DeletedAt != nil {
			continue
		}

		resp := MessageResponse{
			ID:             msg.MessageID.String(),
			ConversationID: msg.ConversationID.String(),
			SenderID:       msg.SenderID.String(),
			SenderName:     msg.SenderName,
			SenderAvatar:   msg.SenderAvatar,
			Type:           msg.MessageType,
			Content:        msg.Content,
			Metadata:       msg.Metadata,
			CreatedAt:      msg.CreatedAt.Format(time.RFC3339),
			UpdatedAt:      msg.UpdatedAt.Format(time.RFC3339),
		}

		if msg.ReplyToID != nil {
			resp.ReplyToID = msg.ReplyToID.String()
		}

		if user, ok := userInfoMap[msg.SenderID]; ok {
			resp.SenderName = user.Username
			resp.SenderAvatar = user.Avatar
		}

		responses = append(responses, resp)
	}

	return &MessagesListResponse{
		Messages: responses,
		Total:    len(responses),
	}, nil
}

func (s *Service) UpdateMessage(userID uuid.UUID, conversationIDStr, messageIDStr, newContent string) (*MessageResponse, error) {
	conversationID, err := uuid.Parse(conversationIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid conversation ID: %w", err)
	}

	messageID, err := gocql.ParseUUID(messageIDStr)
	if err != nil {
		return nil, fmt.Errorf("invalid message ID: %w", err)
	}

	// Get existing message
	msg, err := s.repo.GetMessageByID(conversationID, messageID)
	if err != nil {
		return nil, fmt.Errorf("message not found: %w", err)
	}

	// Validate ownership
	if msg.SenderID != userID {
		return nil, fmt.Errorf("you can only update your own messages")
	}

	// Validate message is not deleted
	if msg.DeletedAt != nil {
		return nil, fmt.Errorf("cannot update deleted message")
	}

	// Validate content
	if newContent == "" {
		return nil, fmt.Errorf("content cannot be empty")
	}

	// Update message in ScyllaDB
	if err := s.repo.UpdateMessage(conversationID, messageID, newContent); err != nil {
		return nil, fmt.Errorf("failed to update message: %w", err)
	}

	// Get members for event
	var sender models.User
	senderName := ""
	senderAvatar := ""
	if err := s.db.First(&sender, "id = ?", userID).Error; err == nil {
		senderName = sender.Username
		senderAvatar = sender.Avatar
	}

	// Build response
	now := time.Now()
	response := &MessageResponse{
		ID:             messageID.String(),
		ConversationID: conversationID.String(),
		SenderID:       userID.String(),
		SenderName:     senderName,
		SenderAvatar:   senderAvatar,
		Type:           msg.MessageType,
		Content:        newContent,
		CreatedAt:      msg.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      now.Format(time.RFC3339),
	}

	go func() {
		s.cache.DeleteMessage(conversationID, messageID)
		s.cache.DeleteConversationMessages(conversationID)
	}()

	responseCopy := *response
	conversationIDCopy := conversationID

	go func(resp MessageResponse, convID uuid.UUID) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		conv, err := s.getConversationByIDCached(convID)
		var convData *messageEvents.ConversationData
		if err == nil && conv != nil {
			convData = &messageEvents.ConversationData{
				ID:               conv.ConversationID.String(),
				Type:             conv.Type,
				Name:             conv.Name,
				Avatar:           conv.Avatar,
				CreatedAt:        conv.CreatedAt.Format(time.RFC3339),
				UpdatedAt:        conv.UpdatedAt.Format(time.RFC3339),
				ParticipantCount: conv.ParticipantCount,
			}
		}

		messageData := &messageEvents.MessageData{
			ID:             resp.ID,
			ConversationID: resp.ConversationID,
			SenderID:       resp.SenderID,
			SenderName:     resp.SenderName,
			SenderAvatar:   resp.SenderAvatar,
			Type:           resp.Type,
			Content:        resp.Content,
			Metadata:       resp.Metadata,
			CreatedAt:      resp.CreatedAt,
			UpdatedAt:      resp.UpdatedAt,
			ReplyToID:      resp.ReplyToID,
		}

		event := &messageEvents.MessageUpdatedEvent{
			Conversation: convData,
			Message:      messageData,
		}
		if err := s.kafkaProducer.PublishMessageUpdated(ctx, event); err != nil {
			s.logger.Errorw("Failed to publish message updated event", "error", err)
		}
	}(responseCopy, conversationIDCopy)

	s.logger.Infow("Message updated successfully",
		"conversation_id", conversationID,
		"message_id", messageID,
		"user_id", userID,
	)

	return response, nil
}

func (s *Service) DeleteMessage(userID uuid.UUID, conversationIDStr, messageIDStr string) error {
	conversationID, err := uuid.Parse(conversationIDStr)
	if err != nil {
		return fmt.Errorf("invalid conversation ID: %w", err)
	}

	messageID, err := gocql.ParseUUID(messageIDStr)
	if err != nil {
		return fmt.Errorf("invalid message ID: %w", err)
	}

	msg, err := s.repo.GetMessageByID(conversationID, messageID)
	if err != nil {
		return fmt.Errorf("message not found: %w", err)
	}

	if msg.SenderID != userID {
		return fmt.Errorf("you can only delete your own messages")
	}

	if err := s.repo.DeleteMessage(conversationID, messageID); err != nil {
		return fmt.Errorf("failed to delete message: %w", err)
	}

	go s.invalidateCachesAfterDelete(conversationID, messageID)

	go func(convID uuid.UUID, msgID string) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		conv, err := s.getConversationByIDCached(convID)
		var convData *messageEvents.ConversationData
		if err == nil && conv != nil {
			convData = &messageEvents.ConversationData{
				ID:               conv.ConversationID.String(),
				Type:             conv.Type,
				Name:             conv.Name,
				Avatar:           conv.Avatar,
				CreatedAt:        conv.CreatedAt.Format(time.RFC3339),
				UpdatedAt:        conv.UpdatedAt.Format(time.RFC3339),
				ParticipantCount: conv.ParticipantCount,
			}
		}

		event := &messageEvents.MessageDeletedEvent{
			Conversation: convData,
			MessageID:    msgID,
		}
		if err := s.kafkaProducer.PublishMessageDeleted(ctx, event); err != nil {
			s.logger.Errorw("Failed to publish message deleted event", "error", err)
		}
	}(conversationID, messageIDStr)

	return nil
}

func (s *Service) getMembersCached(conversationID uuid.UUID) ([]conversation.ConversationMember, error) {
	if cached, err := s.convCache.GetConversationMembers(conversationID); err == nil && len(cached) > 0 {
		s.logger.Debugw("Cache HIT for conversation members", "conversation_id", conversationID)
		return cached, nil
	}

	s.logger.Debugw("Cache MISS for conversation members", "conversation_id", conversationID)
	members, err := s.convRepo.GetMembers(conversationID)
	if err != nil {
		return nil, err
	}

	go func() {
		if err := s.convCache.SetConversationMembers(conversationID, members); err != nil {
			s.logger.Warnw("Failed to cache conversation members", "conversation_id", conversationID, "error", err)
		}
	}()

	return members, nil
}

func (s *Service) getConversationByIDCached(conversationID uuid.UUID) (*conversation.Conversation, error) {
	if cached, err := s.convCache.GetConversation(conversationID); err == nil && cached != nil {
		s.logger.Debugw("Cache HIT for conversation", "conversation_id", conversationID)
		return cached, nil
	}

	s.logger.Debugw("Cache MISS for conversation", "conversation_id", conversationID)
	conv, err := s.convRepo.GetConversationByID(conversationID)
	if err != nil {
		return nil, err
	}

	go func() {
		if err := s.convCache.SetConversation(conv); err != nil {
			s.logger.Warnw("Failed to cache conversation", "conversation_id", conversationID, "error", err)
		}
	}()

	return conv, nil
}

func (s *Service) updateConversationWithRetry(userID uuid.UUID, oldLastMessageAt gocql.UUID, conversationID uuid.UUID, entry *ConversationInboxUpdate, maxRetries int) error {
	var lastErr error
	backoff := 100 * time.Millisecond
	currentOldLastMessageAt := oldLastMessageAt

	for i := 0; i < maxRetries; i++ {
		err := s.repo.UpdateConversationLastMessage(userID, currentOldLastMessageAt, conversationID, entry)
		if err == nil {
			return nil
		}

		lastErr = err
		s.logger.Warnw("Retry updating conversation", "attempt", i+1, "user_id", userID, "error", err)

		if i < maxRetries-1 {
			time.Sleep(backoff)
			backoff *= 2

			freshEntry, freshOldLastMessageAt, readErr := s.repo.GetConversationInboxEntry(userID, conversationID)
			if readErr != nil {
				s.logger.Errorw("Failed to re-read conversation entry for retry",
					"user_id", userID,
					"conversation_id", conversationID,
					"error", readErr,
				)
				continue
			}

			if freshEntry == nil {
				s.logger.Warnw("Conversation entry disappeared during retry", "user_id", userID, "conversation_id", conversationID)
				return fmt.Errorf("conversation entry not found during retry")
			}

			currentOldLastMessageAt = *freshOldLastMessageAt

			entry.LastReadMessageID = freshEntry.LastReadMessageID
			entry.LastReadAt = freshEntry.LastReadAt
			if freshEntry.UnreadCount > entry.UnreadCount {
				entry.UnreadCount = freshEntry.UnreadCount
			}

			s.logger.Infow("Re-read conversation entry for retry",
				"user_id", userID,
				"conversation_id", conversationID,
				"old_timestamp", oldLastMessageAt.Time(),
				"fresh_timestamp", currentOldLastMessageAt.Time(),
			)
		}
	}

	return fmt.Errorf("failed after %d retries: %w", maxRetries, lastErr)
}

func (s *Service) invalidateCachesAfterSend(conversationID uuid.UUID, memberIDs []uuid.UUID) {
	if err := s.cache.InvalidateConversationMessages(conversationID); err != nil {
		s.logger.Warnw("Failed to invalidate conversation messages cache", "conversation_id", conversationID, "error", err)
	}

	var wg sync.WaitGroup
	for _, userID := range memberIDs {
		wg.Add(1)
		go func(uid uuid.UUID) {
			defer wg.Done()
			if err := s.convCache.DeleteUserConversations(uid); err != nil {
				s.logger.Warnw("Failed to invalidate user conversations cache", "user_id", uid, "error", err)
			}
		}(userID)
	}
	wg.Wait()

	s.logger.Debugw("Cache invalidated after send", "conversation_id", conversationID, "member_count", len(memberIDs))
}

func (s *Service) invalidateCachesAfterDelete(conversationID uuid.UUID, messageID gocql.UUID) {
	if err := s.cache.InvalidateConversationMessages(conversationID); err != nil {
		s.logger.Warnw("Failed to invalidate conversation messages cache", "conversation_id", conversationID, "error", err)
	}

	if err := s.cache.DeleteMessage(conversationID, messageID); err != nil {
		s.logger.Warnw("Failed to invalidate message cache", "message_id", messageID, "error", err)
	}

	s.logger.Debugw("Cache invalidated after delete", "conversation_id", conversationID, "message_id", messageID)
}

func (s *Service) publishConversationCreatedEvent(convID, senderID, recipientID uuid.UUID, lastMessage *MessageResponse) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conv, err := s.getConversationByIDCached(convID)
	if err != nil {
		s.logger.Errorw("Failed to get conversation for CREATED event", "conversation_id", convID, "error", err)
		return
	}

	var senderUser, recipientUser models.User
	if err := s.db.First(&senderUser, "id = ?", senderID).Error; err != nil {
		s.logger.Errorw("Failed to get sender user", "user_id", senderID, "error", err)
		return
	}
	if err := s.db.First(&recipientUser, "id = ?", recipientID).Error; err != nil {
		s.logger.Errorw("Failed to get recipient user", "user_id", recipientID, "error", err)
		return
	}

	lastMessageText := ""
	lastMessageAt := conv.CreatedAt.Format(time.RFC3339)
	if lastMessage != nil {
		lastMessageText = lastMessage.Content
		lastMessageAt = lastMessage.CreatedAt
	}

	participants := []map[string]interface{}{
		{
			"userId":   senderID.String(),
			"username": senderUser.Username,
			"avatar":   senderUser.Avatar,
		},
		{
			"userId":   recipientID.String(),
			"username": recipientUser.Username,
			"avatar":   recipientUser.Avatar,
		},
	}

	senderEvent := &conversationEvents.CreatedEvent{
		ConversationID: convID.String(),
		Data: map[string]interface{}{
			"id":               conv.ConversationID.String(),
			"type":             conv.Type,
			"name":             recipientUser.Username,
			"avatar":           recipientUser.Avatar,
			"createdAt":        conv.CreatedAt.Format(time.RFC3339),
			"updatedAt":        conv.UpdatedAt.Format(time.RFC3339),
			"participantCount": conv.ParticipantCount,
			"lastMessageText":  lastMessageText,
			"lastMessageAt":    lastMessageAt,
			"unreadCount":      0,
			"participants":     participants,
		},
	}

	recipientEvent := &conversationEvents.CreatedEvent{
		ConversationID: convID.String(),
		Data: map[string]interface{}{
			"id":               conv.ConversationID.String(),
			"type":             conv.Type,
			"name":             senderUser.Username,
			"avatar":           senderUser.Avatar,
			"createdAt":        conv.CreatedAt.Format(time.RFC3339),
			"updatedAt":        conv.UpdatedAt.Format(time.RFC3339),
			"participantCount": conv.ParticipantCount,
			"lastMessageText":  lastMessageText,
			"lastMessageAt":    lastMessageAt,
			"unreadCount":      1,
			"participants":     participants,
		},
	}

	if err := s.kafkaProducer.PublishConversationCreated(ctx, senderEvent); err != nil {
		s.logger.Errorw("Failed to publish CONVERSATION_CREATED event for sender", "conversation_id", convID, "error", err)
	} else {
		s.logger.Infow("Published CONVERSATION_CREATED event for sender", "conversation_id", convID)
	}

	if err := s.kafkaProducer.PublishConversationCreated(ctx, recipientEvent); err != nil {
		s.logger.Errorw("Failed to publish CONVERSATION_CREATED event for recipient", "conversation_id", convID, "error", err)
	} else {
		s.logger.Infow("Published CONVERSATION_CREATED event for recipient", "conversation_id", convID)
	}
}

func (s *Service) recreateInboxEntry(userID, conversationID uuid.UUID, messageID gocql.UUID, messageBody string, senderID uuid.UUID, incrementUnread bool) error {
	conv, err := s.getConversationByIDCached(conversationID)
	if err != nil {
		return fmt.Errorf("failed to get conversation: %w", err)
	}

	gocqlUserID, err := utils.ToGocqlUUID(userID)
	if err != nil {
		return fmt.Errorf("failed to convert userID: %w", err)
	}
	gocqlConvID, err := utils.ToGocqlUUID(conversationID)
	if err != nil {
		return fmt.Errorf("failed to convert conversationID: %w", err)
	}
	gocqlSenderID, err := utils.ToGocqlUUID(senderID)
	if err != nil {
		return fmt.Errorf("failed to convert senderID: %w", err)
	}

	unreadCount := 0
	if incrementUnread {
		unreadCount = 1
	}

	if conv.Type == "direct" {
		members, err := s.getMembersCached(conversationID)
		if err != nil {
			return fmt.Errorf("failed to get members: %w", err)
		}

		var otherUserID uuid.UUID
		for _, member := range members {
			if member.UserID != userID && member.IsActive {
				otherUserID = member.UserID
				break
			}
		}

		if otherUserID == uuid.Nil {
			return fmt.Errorf("failed to find other user in conversation")
		}

		otherUser, err := s.userCache.GetUserCache(otherUserID, true)
		if err != nil {
			return fmt.Errorf("failed to get other user: %w", err)
		}

		gocqlOtherUserID, err := utils.ToGocqlUUID(otherUserID)
		if err != nil {
			return fmt.Errorf("failed to convert otherUserID: %w", err)
		}

		now := time.Now()
		inboxEntry := &conversation.ConversationByUser{
			UserID:             gocqlUserID,
			ConversationID:     gocqlConvID,
			ConversationType:   "direct",
			DisplayName:        otherUser.Username,
			DisplayAvatar:      otherUser.Avatar,
			OtherUserID:        &gocqlOtherUserID,
			OtherUserName:      otherUser.Username,
			OtherUserAvatar:    otherUser.Avatar,
			LastMessageAt:      messageID,
			LastMessageID:      &messageID,
			LastMessagePreview: messageBody,
			LastMessageSender:  &gocqlSenderID,
			UnreadCount:        unreadCount,
			UpdatedAt:          &now,
		}

		if err := s.convRepo.AddConversationToUserInbox(inboxEntry); err != nil {
			return fmt.Errorf("failed to add conversation to inbox: %w", err)
		}
	} else {
		now := time.Now()
		inboxEntry := &conversation.ConversationByUser{
			UserID:             gocqlUserID,
			ConversationID:     gocqlConvID,
			ConversationType:   "group",
			DisplayName:        conv.Name,
			DisplayAvatar:      conv.Avatar,
			LastMessageAt:      messageID,
			LastMessageID:      &messageID,
			LastMessagePreview: messageBody,
			LastMessageSender:  &gocqlSenderID,
			UnreadCount:        unreadCount,
			UpdatedAt:          &now,
		}

		if err := s.convRepo.AddConversationToUserInbox(inboxEntry); err != nil {
			return fmt.Errorf("failed to add conversation to inbox: %w", err)
		}
	}

	go s.convCache.DeleteUserConversations(userID)

	return nil
}
