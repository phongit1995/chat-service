package message

import (
	conversationEvents "chat-server/internal/domain/conversation"
	messageEvents "chat-server/internal/domain/message"
	"chat-server/internal/infra/kafka"
	"chat-server/internal/models"
	"chat-server/internal/modules/conversation"
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
	db            *gorm.DB
	kafkaProducer *kafka.Producer
	logger        *zap.SugaredLogger
}

func NewService(repo *Repository, cache *CacheService, convRepo *conversation.Repository, convCache *conversation.CacheService, db *gorm.DB, kafkaProducer *kafka.Producer, logger *zap.SugaredLogger) *Service {
	return &Service{
		repo:          repo,
		cache:         cache,
		convRepo:      convRepo,
		convCache:     convCache,
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

		go func(convID uuid.UUID, sender, recipient uuid.UUID) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			conv, err := s.getConversationByIDCached(convID)
			if err != nil {
				s.logger.Errorw("Failed to get conversation for CREATED event", "conversation_id", convID, "error", err)
				return
			}

			event := &conversationEvents.CreatedEvent{
				ConversationID: convID.String(),
				Data: map[string]interface{}{
					"id":               conv.ConversationID.String(),
					"type":             conv.Type,
					"name":             conv.Name,
					"avatar":           conv.Avatar,
					"createdAt":        conv.CreatedAt.Format(time.RFC3339),
					"updatedAt":        conv.UpdatedAt.Format(time.RFC3339),
					"participantCount": conv.ParticipantCount,
				},
			}

			if err := s.kafkaProducer.PublishConversationCreated(ctx, event); err != nil {
				s.logger.Errorw("Failed to publish CONVERSATION_CREATED event", "conversation_id", convID, "error", err)
			} else {
				s.logger.Infow("Published CONVERSATION_CREATED event", "conversation_id", convID)
			}
		}(conversationID, senderID, recipientID)
	}

	return s.SendMessage(senderID, conversationID, messageType, content, metadata, nil)
}

func (s *Service) createFullDirectConversation(user1ID, user2ID, conversationID uuid.UUID) error {
	var user1, user2 models.User
	if err := s.db.First(&user1, "id = ?", user1ID).Error; err != nil {
		return fmt.Errorf("user1 not found: %w", err)
	}
	if err := s.db.First(&user2, "id = ?", user2ID).Error; err != nil {
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
		UserID:          gocqlUser1ID,
		LastMessageAt:   lastMessageAt,
		ConversationID:  gocqlConvID,
		IsGroup:         false,
		OtherUserID:     &gocqlUser2ID,
		OtherUserName:   user2.Username,
		OtherUserAvatar: user2.Avatar,
		Title:           user2.Username,
		Avatar:          user2.Avatar,
		UnreadCount:     0,
	}
	inbox2 := &conversation.ConversationByUser{
		UserID:          gocqlUser2ID,
		LastMessageAt:   lastMessageAt,
		ConversationID:  gocqlConvID,
		IsGroup:         false,
		OtherUserID:     &gocqlUser1ID,
		OtherUserName:   user1.Username,
		OtherUserAvatar: user1.Avatar,
		Title:           user1.Username,
		Avatar:          user1.Avatar,
		UnreadCount:     0,
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

	msg := &Message{
		ConversationID: conversationID,
		MessageID:      messageID,
		SenderID:       senderID,
		MessageType:    messageType,
		Content:        content,
		Metadata:       metadata,
		Status:         "sent",
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

					unreadCount := 0
					if m.UserID != senderID {
						unreadCount = 1
					}

					if unhideErr := s.convRepo.UnhideConversation(m.UserID, conversationID, messageID,
						&messageID, shortContent, &senderID, unreadCount); unhideErr != nil {
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

				s.logger.Errorw("No inbox entry found for user and not hidden", "user_id", m.UserID, "conversation_id", conversationID)
				errMux.Lock()
				if firstError == nil {
					firstError = fmt.Errorf("inbox entry missing for user %s", m.UserID)
				}
				errMux.Unlock()
				return
			}

			newUnreadCount := inboxEntry.UnreadCount
			if m.UserID != senderID {
				newUnreadCount++
			}

			updatedEntry := &ConversationInboxUpdate{
				UserID:            m.UserID,
				LastMessageAt:     messageID,
				ConversationID:    conversationID,
				IsGroup:           inboxEntry.IsGroup,
				OtherUserID:       inboxEntry.OtherUserID,
				OtherUserName:     inboxEntry.OtherUserName,
				OtherUserAvatar:   inboxEntry.OtherUserAvatar,
				Title:             inboxEntry.Title,
				Avatar:            inboxEntry.Avatar,
				LastMessageID:     &messageID,
				LastMessageBody:   shortContent,
				LastMessageSender: &senderID,
				UnreadCount:       newUnreadCount,
				LastReadMessageID: inboxEntry.LastReadMessageID,
				LastReadAt:        inboxEntry.LastReadAt,
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
		Type:           messageType,
		Content:        content,
		Metadata:       metadata,
		Status:         "sent",
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
			Status:         resp.Status,
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
			Type:           msg.MessageType,
			Content:        msg.Content,
			Metadata:       msg.Metadata,
			Status:         msg.Status,
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
	members, err := s.getMembersCached(conversationID)
	if err != nil {
		s.logger.Warnw("Failed to get members for event", "conversation_id", conversationID, "error", err)
		members = []conversation.ConversationMember{}
	}

	userIDs := make([]string, 0, len(members))
	for _, member := range members {
		if member.IsActive {
			userIDs = append(userIDs, member.UserID.String())
		}
	}

	// Get sender info
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
		Status:         msg.Status,
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
			Status:         resp.Status,
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

	members, err := s.getMembersCached(conversationID)
	if err != nil {
		s.logger.Warnw("Failed to get members for event", "conversation_id", conversationID, "error", err)
		members = []conversation.ConversationMember{}
	}

	userIDs := make([]string, 0, len(members))
	for _, member := range members {
		if member.IsActive {
			userIDs = append(userIDs, member.UserID.String())
		}
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

	for i := 0; i < maxRetries; i++ {
		err := s.repo.UpdateConversationLastMessage(userID, oldLastMessageAt, conversationID, entry)
		if err == nil {
			return nil
		}

		lastErr = err
		s.logger.Warnw("Retry updating conversation", "attempt", i+1, "user_id", userID, "error", err)

		if i < maxRetries-1 {
			time.Sleep(backoff)
			backoff *= 2
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
