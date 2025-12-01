package conversation

import (
	"chat-server/internal/constants"
	"chat-server/internal/services"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

type CacheService struct {
	cache  *services.CacheService
	logger *zap.SugaredLogger
}

func NewCacheService(cache *services.CacheService, logger *zap.SugaredLogger) *CacheService {
	return &CacheService{
		cache:  cache,
		logger: logger.Named("[conversation_cache]"),
	}
}

func (c *CacheService) GetConversation(conversationID uuid.UUID) (*Conversation, error) {
	key := fmt.Sprintf(constants.CacheKeyConversation, conversationID.String())
	var conversation Conversation
	if err := c.cache.Get(key, &conversation); err != nil {
		return nil, err
	}
	return &conversation, nil
}

func (c *CacheService) SetConversation(conversation *Conversation) error {
	key := fmt.Sprintf(constants.CacheKeyConversation, conversation.ConversationID.String())
	return c.cache.Set(key, conversation, constants.CacheTTLConversation*time.Second)
}

func (c *CacheService) DeleteConversation(conversationID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyConversation, conversationID.String())
	return c.cache.Delete(key)
}

func (c *CacheService) GetConversationMembers(conversationID uuid.UUID) ([]ConversationMember, error) {
	key := fmt.Sprintf(constants.CacheKeyConversationMembers, conversationID.String())
	var members []ConversationMember
	if err := c.cache.Get(key, &members); err != nil {
		return nil, err
	}
	return members, nil
}

func (c *CacheService) SetConversationMembers(conversationID uuid.UUID, members []ConversationMember) error {
	key := fmt.Sprintf(constants.CacheKeyConversationMembers, conversationID.String())
	return c.cache.Set(key, members, constants.CacheTTLConversation*time.Second)
}

func (c *CacheService) DeleteConversationMembers(conversationID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyConversationMembers, conversationID.String())
	return c.cache.Delete(key)
}

func (c *CacheService) GetUserConversations(userID uuid.UUID) ([]ConversationByUser, error) {
	key := fmt.Sprintf(constants.CacheKeyConversationList, userID.String())
	var conversations []ConversationByUser
	if err := c.cache.Get(key, &conversations); err != nil {
		return nil, err
	}
	return conversations, nil
}

func (c *CacheService) SetUserConversations(userID uuid.UUID, conversations []ConversationByUser) error {
	key := fmt.Sprintf(constants.CacheKeyConversationList, userID.String())
	return c.cache.Set(key, conversations, constants.CacheTTLConversationList*time.Second)
}

func (c *CacheService) DeleteUserConversations(userID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyConversationList, userID.String())
	return c.cache.Delete(key)
}

func (c *CacheService) GetDirectConversation(user1ID, user2ID uuid.UUID) (*uuid.UUID, error) {
	userA, userB := user1ID, user2ID
	if user1ID.String() > user2ID.String() {
		userA, userB = user2ID, user1ID
	}

	key := fmt.Sprintf(constants.CacheKeyConversation, fmt.Sprintf("direct:%s:%s", userA.String(), userB.String()))
	var conversationID string
	if err := c.cache.Get(key, &conversationID); err != nil {
		return nil, err
	}
	id, err := uuid.Parse(conversationID)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

func (c *CacheService) SetDirectConversation(user1ID, user2ID, conversationID uuid.UUID) error {
	userA, userB := user1ID, user2ID
	if user1ID.String() > user2ID.String() {
		userA, userB = user2ID, user1ID
	}

	key := fmt.Sprintf(constants.CacheKeyConversation, fmt.Sprintf("direct:%s:%s", userA.String(), userB.String()))
	return c.cache.Set(key, conversationID.String(), constants.CacheTTLConversation*time.Second)
}

func (c *CacheService) GetUnreadCount(conversationID, userID uuid.UUID) (int, error) {
	key := fmt.Sprintf(constants.CacheKeyUnreadCount, fmt.Sprintf("%s:%s", conversationID.String(), userID.String()))
	var count int
	if err := c.cache.Get(key, &count); err != nil {
		return 0, err
	}
	return count, nil
}

func (c *CacheService) SetUnreadCount(conversationID, userID uuid.UUID, count int) error {
	key := fmt.Sprintf(constants.CacheKeyUnreadCount, fmt.Sprintf("%s:%s", conversationID.String(), userID.String()))
	return c.cache.Set(key, count, constants.CacheTTLUnreadCount*time.Second)
}

func (c *CacheService) IncrementUnreadCount(conversationID, userID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyUnreadCount, fmt.Sprintf("%s:%s", conversationID.String(), userID.String()))
	_, err := c.cache.Increment(key)
	if err != nil {
		return c.SetUnreadCount(conversationID, userID, 1)
	}
	return c.cache.SetExpire(key, constants.CacheTTLUnreadCount*time.Second)
}

func (c *CacheService) ResetUnreadCount(conversationID, userID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyUnreadCount, fmt.Sprintf("%s:%s", conversationID.String(), userID.String()))
	return c.cache.Delete(key)
}

func (c *CacheService) InvalidateConversation(conversationID uuid.UUID) error {
	if err := c.DeleteConversation(conversationID); err != nil {
		c.logger.Warnw("Failed to delete conversation cache", "conversation_id", conversationID, "error", err)
	}

	if err := c.DeleteConversationMembers(conversationID); err != nil {
		c.logger.Warnw("Failed to delete conversation members cache", "conversation_id", conversationID, "error", err)
	}

	return nil
}

func (c *CacheService) InvalidateUserConversations(userIDs []uuid.UUID) error {
	for _, userID := range userIDs {
		if err := c.DeleteUserConversations(userID); err != nil {
			c.logger.Warnw("Failed to delete user conversations cache", "user_id", userID, "error", err)
		}
	}
	return nil
}
