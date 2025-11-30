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
	db     *gorm.DB
	logger *zap.SugaredLogger
}

func NewService(repo *Repository, db *gorm.DB, logger *zap.SugaredLogger) *Service {
	return &Service{
		repo:   repo,
		db:     db,
		logger: logger.Named("[conversation_service]"),
	}
}

func (s *Service) CreateDirectConversation(user1ID, user2ID uuid.UUID) (*ConversationResponse, error) {
	if user1ID == user2ID {
		return nil, fmt.Errorf("cannot create conversation with yourself")
	}

	// Get user information from PostgreSQL
	var user1, user2 models.User
	if err := s.db.First(&user1, "id = ?", user1ID).Error; err != nil {
		return nil, fmt.Errorf("user1 not found: %w", err)
	}
	if err := s.db.First(&user2, "id = ?", user2ID).Error; err != nil {
		return nil, fmt.Errorf("user2 not found: %w", err)
	}

	// Check if direct conversation already exists
	conversationID, isNew, err := s.repo.GetOrCreateDirectConversation(user1ID, user2ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get or create conversation: %w", err)
	}

	now := time.Now()

	if isNew {
		// Create conversation metadata
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
		if err := s.repo.CreateConversation(conv); err != nil {
			return nil, fmt.Errorf("failed to create conversation: %w", err)
		}

		// Add both users as members
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
		if err := s.repo.AddMember(member1); err != nil {
			return nil, fmt.Errorf("failed to add member1: %w", err)
		}
		if err := s.repo.AddMember(member2); err != nil {
			return nil, fmt.Errorf("failed to add member2: %w", err)
		}

		// Add to both users' inboxes
		lastMessageAt := gocql.TimeUUID()

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

		if err := s.repo.AddConversationToUserInbox(inbox1); err != nil {
			return nil, fmt.Errorf("failed to add to user1 inbox: %w", err)
		}
		if err := s.repo.AddConversationToUserInbox(inbox2); err != nil {
			return nil, fmt.Errorf("failed to add to user2 inbox: %w", err)
		}
	}

	return &ConversationResponse{
		ID:               conversationID.String(),
		Type:             "direct",
		Name:             user2.Username,
		Avatar:           user2.Avatar,
		CreatedAt:        now.Format(time.RFC3339),
		UpdatedAt:        now.Format(time.RFC3339),
		ParticipantCount: 2,
		IsNew:            isNew,
	}, nil
}

func (s *Service) CreateGroupConversation(creatorID uuid.UUID, name string, participantIDs []uuid.UUID) (*ConversationResponse, error) {
	if len(participantIDs) < 2 {
		return nil, fmt.Errorf("group conversation must have at least 2 participants")
	}
	if name == "" {
		return nil, fmt.Errorf("group name is required")
	}

	// Add creator to participants
	participantIDs = append(participantIDs, creatorID)
	uniqueParticipants := make(map[uuid.UUID]bool)
	for _, id := range participantIDs {
		uniqueParticipants[id] = true
	}

	// Verify all participants exist
	for participantID := range uniqueParticipants {
		var user models.User
		if err := s.db.First(&user, "id = ?", participantID).Error; err != nil {
			return nil, fmt.Errorf("participant %s not found: %w", participantID, err)
		}
	}

	now := time.Now()
	conversationID := uuid.New()

	// Create conversation metadata
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
	if err := s.repo.CreateConversation(conv); err != nil {
		return nil, fmt.Errorf("failed to create conversation: %w", err)
	}

	lastMessageAt := gocql.TimeUUID()

	// Add all participants as members and to their inboxes
	for participantID := range uniqueParticipants {
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
		if err := s.repo.AddMember(member); err != nil {
			return nil, fmt.Errorf("failed to add member %s: %w", participantID, err)
		}

		inbox := &ConversationByUser{
			UserID:         participantID,
			LastMessageAt:  lastMessageAt,
			ConversationID: conversationID,
			IsGroup:        true,
			Title:          name,
			Avatar:         "",
			UnreadCount:    0,
		}
		if err := s.repo.AddConversationToUserInbox(inbox); err != nil {
			return nil, fmt.Errorf("failed to add to user %s inbox: %w", participantID, err)
		}
	}

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

		// LastMessageAt is a timeuuid, not a pointer
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
	// Verify user is a member
	members, err := s.repo.GetMembers(conversationID)
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

	// Mark as read with current timestamp and latest message ID
	now := time.Now()
	lastReadMessageID := gocql.TimeUUID()

	if err := s.repo.MarkAsRead(conversationID, userID, lastReadMessageID, now); err != nil {
		return fmt.Errorf("failed to mark as read: %w", err)
	}

	return nil
}
