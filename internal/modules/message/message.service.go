package message

import (
	"chat-server/internal/models"
	"chat-server/internal/modules/conversation"
	"chat-server/internal/services"
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
	kafkaProducer *services.KafkaProducer
	logger        *zap.SugaredLogger
}

func NewService(repo *Repository, cache *CacheService, convRepo *conversation.Repository, convCache *conversation.CacheService, db *gorm.DB, kafkaProducer *services.KafkaProducer, logger *zap.SugaredLogger) *Service {
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
	var wg sync.WaitGroup

	for _, member := range members {
		if !member.IsActive {
			continue
		}

		memberIDs = append(memberIDs, member.UserID)

		inboxEntry, oldLastMessageAt, err := s.repo.GetConversationInboxEntry(member.UserID, conversationID)
		if err != nil {
			s.logger.Warnw("Failed to get inbox entry", "user_id", member.UserID, "error", err)
			continue
		}

		if inboxEntry == nil {
			s.logger.Warnw("No inbox entry found for user", "user_id", member.UserID, "conversation_id", conversationID)
			continue
		}

		newUnreadCount := inboxEntry.UnreadCount
		if member.UserID != senderID {
			newUnreadCount++
		}

		updatedEntry := &ConversationInboxUpdate{
			UserID:            member.UserID,
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

		if err := s.updateConversationWithRetry(member.UserID, *oldLastMessageAt, conversationID, updatedEntry, 3); err != nil {
			s.logger.Errorw("Failed to update conversation after retries", "user_id", member.UserID, "error", err)
		}
	}

	wg.Wait()

	var sender models.User
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

	if err := s.db.First(&sender, "id = ?", senderID).Error; err == nil {
		response.SenderName = sender.Username
		response.SenderAvatar = sender.Avatar
	}

	wg.Add(1)
	go func() {
		defer wg.Done()
		s.invalidateCachesAfterSend(conversationID, memberIDs)
	}()
	wg.Wait()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := s.kafkaProducer.PublishMessageCreated(ctx, response); err != nil {
		s.logger.Errorw("Failed to publish message created event", "error", err)
	}

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

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		s.invalidateCachesAfterDelete(conversationID, messageID)
	}()
	wg.Wait()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	payload := map[string]string{
		"conversation_id": conversationIDStr,
		"message_id":      messageIDStr,
	}
	if err := s.kafkaProducer.PublishMessageDeleted(ctx, payload); err != nil {
		s.logger.Errorw("Failed to publish message deleted event", "error", err)
	}

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
