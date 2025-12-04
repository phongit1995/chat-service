package message

import (
	messageEvents "chat-server/internal/events/message"
	"chat-server/internal/infra/kafka"
	"chat-server/internal/models"
	"chat-server/internal/modules/conversation"
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

	inbox1 := &conversation.ConversationByUser{
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
	inbox2 := &conversation.ConversationByUser{
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
	s.convRepo.AddConversationToUserInboxBatch(batch, inbox1)
	s.convRepo.AddConversationToUserInboxBatch(batch, inbox2)

	if err := s.convRepo.ExecuteBatch(batch); err != nil {
		return fmt.Errorf("failed to execute batch: %w", err)
	}

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		s.convCache.InvalidateUserConversations([]uuid.UUID{user1ID, user2ID})
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

	for _, member := range members {
		if !member.IsActive {
			continue
		}

		memberIDs = append(memberIDs, member.UserID)

		inboxEntry, oldLastMessageAt, err := s.repo.GetConversationInboxEntry(member.UserID, conversationID)
		if err != nil {
			s.logger.Errorw("Failed to get inbox entry", "user_id", member.UserID, "error", err)
			return nil, fmt.Errorf("inbox entry not found for user %s", member.UserID)
		}

		if inboxEntry == nil {
			s.logger.Errorw("No inbox entry found for user", "user_id", member.UserID, "conversation_id", conversationID)
			return nil, fmt.Errorf("inbox entry missing for user %s", member.UserID)
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
			return nil, fmt.Errorf("failed to update inbox for user %s: %w", member.UserID, err)
		}
	}

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

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		s.invalidateCachesAfterSend(conversationID, memberIDs)
	}()
	wg.Wait()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userIDs := make([]string, len(memberIDs))
	for i, id := range memberIDs {
		userIDs[i] = id.String()
	}

	event := &messageEvents.CreatedEvent{
		ConversationID: conversationID.String(),
		MessageID:      messageID.String(),
		SenderID:       senderID.String(),
		UserIDs:        userIDs,
		Data:           response,
	}
	if err := s.kafkaProducer.PublishMessageCreated(ctx, event); err != nil {
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

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		s.invalidateCachesAfterDelete(conversationID, messageID)
	}()
	wg.Wait()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	event := &messageEvents.DeletedEvent{
		ConversationID: conversationIDStr,
		MessageID:      messageIDStr,
		UserIDs:        userIDs,
	}
	if err := s.kafkaProducer.PublishMessageDeleted(ctx, event); err != nil {
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
