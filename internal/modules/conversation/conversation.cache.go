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
	repo   *Repository
}

func NewCacheService(cache *services.CacheService, repo *Repository, logger *zap.SugaredLogger) *CacheService {
	return &CacheService{
		cache:  cache,
		repo:   repo,
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
	key := fmt.Sprintf(constants.CacheKeyUnreadCount, conversationID.String(), userID.String())
	var count int
	if err := c.cache.Get(key, &count); err != nil {
		return 0, err
	}
	return count, nil
}

func (c *CacheService) SetUnreadCount(conversationID, userID uuid.UUID, count int) error {
	key := fmt.Sprintf(constants.CacheKeyUnreadCount, conversationID.String(), userID.String())
	return c.cache.Set(key, count, constants.CacheTTLUnreadCount*time.Second)
}

func (c *CacheService) IncrementUnreadCount(conversationID, userID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyUnreadCount, conversationID.String(), userID.String())
	_, err := c.cache.Increment(key)
	if err != nil {
		return c.SetUnreadCount(conversationID, userID, 1)
	}
	return c.cache.SetExpire(key, constants.CacheTTLUnreadCount*time.Second)
}

func (c *CacheService) ResetUnreadCount(conversationID, userID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyUnreadCount, conversationID.String(), userID.String())
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

// GetHiddenConversations gets the set of hidden conversation IDs for a user from Redis
func (c *CacheService) GetHiddenConversations(userID uuid.UUID) (map[string]bool, error) {
	key := fmt.Sprintf(constants.CacheKeyHiddenConversations, userID.String())
	var hiddenMap map[string]bool
	if err := c.cache.Get(key, &hiddenMap); err != nil {
		return nil, err
	}
	return hiddenMap, nil
}

// SetHiddenConversations sets the set of hidden conversation IDs for a user in Redis
func (c *CacheService) SetHiddenConversations(userID uuid.UUID, hiddenMap map[string]bool) error {
	key := fmt.Sprintf(constants.CacheKeyHiddenConversations, userID.String())
	return c.cache.Set(key, hiddenMap, constants.CacheTTLHiddenConversations*time.Second)
}

// AddHiddenConversation adds a conversation to the hidden set in Redis
func (c *CacheService) AddHiddenConversation(userID, conversationID uuid.UUID) error {
	hiddenMap, err := c.GetHiddenConversations(userID)
	if err != nil {
		// If cache miss, start with new map
		hiddenMap = make(map[string]bool)
	}
	hiddenMap[conversationID.String()] = true
	return c.SetHiddenConversations(userID, hiddenMap)
}

// RemoveHiddenConversation removes a conversation from the hidden set in Redis
func (c *CacheService) RemoveHiddenConversation(userID, conversationID uuid.UUID) error {
	hiddenMap, err := c.GetHiddenConversations(userID)
	if err != nil {
		// If cache miss, nothing to remove
		return nil
	}
	delete(hiddenMap, conversationID.String())
	return c.SetHiddenConversations(userID, hiddenMap)
}

// IsConversationHidden checks if a conversation is hidden (from Redis cache)
func (c *CacheService) IsConversationHidden(userID, conversationID uuid.UUID) (bool, error) {
	hiddenMap, err := c.GetHiddenConversations(userID)
	if err != nil {
		return false, err
	}
	return hiddenMap[conversationID.String()], nil
}

// DeleteHiddenConversationsCache invalidates the hidden conversations cache for a user
func (c *CacheService) DeleteHiddenConversationsCache(userID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyHiddenConversations, userID.String())
	return c.cache.Delete(key)
}

func (c *CacheService) GetLastRead(conversationID, userID uuid.UUID) (string, error) {
	key := fmt.Sprintf(constants.CacheKeyLastRead, conversationID.String(), userID.String())
	var msgID string
	if err := c.cache.Get(key, &msgID); err != nil {
		return "", err
	}
	return msgID, nil
}

func (c *CacheService) SetLastRead(conversationID, userID uuid.UUID, messageID string) error {
	key := fmt.Sprintf(constants.CacheKeyLastRead, conversationID.String(), userID.String())
	return c.cache.Set(key, messageID, constants.CacheTTLLastRead*time.Second)
}

func (c *CacheService) DeleteLastRead(conversationID, userID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyLastRead, conversationID.String(), userID.String())
	return c.cache.Delete(key)
}

func (c *CacheService) GetMembersCached(conversationID uuid.UUID) ([]ConversationMember, error) {
	if cached, err := c.GetConversationMembers(conversationID); err == nil && len(cached) > 0 {
		return cached, nil
	}

	members, err := c.repo.GetMembers(conversationID)
	if err != nil {
		return nil, err
	}

	go func() {
		if err := c.SetConversationMembers(conversationID, members); err != nil {
			c.logger.Warnw("Failed to cache conversation members", "conversation_id", conversationID, "error", err)
		}
	}()

	return members, nil
}

func (c *CacheService) GetConversationByIDCached(conversationID uuid.UUID) (*Conversation, error) {
	if cached, err := c.GetConversation(conversationID); err == nil && cached != nil {
		return cached, nil
	}

	conv, err := c.repo.GetConversationByID(conversationID)
	if err != nil {
		return nil, err
	}

	go func() {
		if err := c.SetConversation(conv); err != nil {
			c.logger.Warnw("Failed to cache conversation", "conversation_id", conversationID, "error", err)
		}
	}()

	return conv, nil
}

func (c *CacheService) GetUserConversationsCached(userID uuid.UUID, limit int) ([]ConversationByUser, error) {
	if cached, err := c.GetUserConversations(userID); err == nil && len(cached) > 0 {
		if len(cached) > limit {
			return cached[:limit], nil
		}
		return cached, nil
	}

	conversations, err := c.repo.GetUserConversations(userID, limit)
	if err != nil {
		return nil, err
	}

	go func() {
		if err := c.SetUserConversations(userID, conversations); err != nil {
			c.logger.Warnw("Failed to cache user conversations", "user_id", userID, "error", err)
		}
	}()

	return conversations, nil
}

func (c *CacheService) CheckIfHiddenCached(userID, conversationID uuid.UUID) (bool, error) {
	isHidden, err := c.IsConversationHidden(userID, conversationID)
	if err == nil {
		return isHidden, nil
	}

	isHidden, err = c.repo.CheckIfHidden(userID, conversationID)
	if err != nil {
		return false, fmt.Errorf("failed to check hidden status: %w", err)
	}

	if isHidden {
		go func() {
			if err := c.AddHiddenConversation(userID, conversationID); err != nil {
				c.logger.Warnw("Failed to cache hidden status", "user_id", userID, "conversation_id", conversationID, "error", err)
			}
		}()
	}

	return isHidden, nil
}

func (c *CacheService) IsTypingRateLimited(userID, conversationID uuid.UUID) bool {
	key := fmt.Sprintf(constants.CacheKeyTypingRateLimit, userID.String(), conversationID.String())
	var dummy string
	return c.cache.Get(key, &dummy) == nil
}

func (c *CacheService) SetTypingRateLimit(userID, conversationID uuid.UUID) {
	key := fmt.Sprintf(constants.CacheKeyTypingRateLimit, userID.String(), conversationID.String())
	if err := c.cache.Set(key, "1", 5*time.Second); err != nil {
		c.logger.Warnw("Failed to set typing rate limit", "error", err)
	}
}
