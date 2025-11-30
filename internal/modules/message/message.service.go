package message

import (
	"chat-server/internal/models"
	"chat-server/internal/modules/conversation"
	"chat-server/internal/modules/websocket"
	"fmt"
	"time"

	"github.com/gocql/gocql"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type Service struct {
	repo      *Repository
	convRepo  *conversation.Repository
	db        *gorm.DB
	wsServer  *websocket.Server
	logger    *zap.SugaredLogger
}

func NewService(repo *Repository, convRepo *conversation.Repository, db *gorm.DB, wsServer *websocket.Server, logger *zap.SugaredLogger) *Service {
	return &Service{
		repo:      repo,
		convRepo:  convRepo,
		db:        db,
		wsServer:  wsServer,
		logger:    logger.Named("[message_service]"),
	}
}

func (s *Service) SendMessage(senderID, conversationID uuid.UUID, messageType, content, metadata string, replyToID *uuid.UUID) (*MessageResponse, error) {
	_, err := s.convRepo.GetConversationByID(conversationID)
	if err != nil {
		return nil, fmt.Errorf("conversation not found: %w", err)
	}

	members, err := s.convRepo.GetMembers(conversationID)
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

	for _, member := range members {
		if !member.IsActive {
			continue
		}

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

		if err := s.repo.UpdateConversationLastMessage(member.UserID, *oldLastMessageAt, conversationID, updatedEntry); err != nil {
			s.logger.Warnw("Failed to update conversation last message", "user_id", member.UserID, "error", err)
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

	s.wsServer.EmitNewMessage(conversationID.String(), response)

	return response, nil
}

func (s *Service) GetMessages(userID, conversationID uuid.UUID, limit int, beforeMessageID *string) (*MessagesListResponse, error) {
	members, err := s.convRepo.GetMembers(conversationID)
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

	messages, err := s.repo.GetMessages(conversationID, limit, beforeTimeuuid)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
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

	s.wsServer.EmitMessageDeleted(conversationIDStr, messageIDStr)

	return nil
}
