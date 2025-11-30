package conversation

import (
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

const (
	conversationPrefix          = "conversation:"
	conversationMembersPrefix   = "conversation:members:"
	userConversationsPrefix     = "user:conversations:"
	conversationMetadataPrefix  = "conversation:metadata:"
	directConversationPrefix    = "conversation:direct:"
	conversationUnreadPrefix    = "conversation:unread:"
	conversationCacheTTL        = 15 * time.Minute
	userConversationsCacheTTL   = 5 * time.Minute
	conversationMembersCacheTTL = 30 * time.Minute
)

// GetConversation retrieves conversation metadata from cache
func (c *CacheService) GetConversation(conversationID uuid.UUID) (*Conversation, error) {
	key := fmt.Sprintf("%s%s", conversationPrefix, conversationID.String())
	var conversation Conversation
	if err := c.cache.Get(key, &conversation); err != nil {
		return nil, err
	}
	return &conversation, nil
}

// SetConversation caches conversation metadata
func (c *CacheService) SetConversation(conversation *Conversation) error {
	key := fmt.Sprintf("%s%s", conversationPrefix, conversation.ConversationID.String())
	return c.cache.Set(key, conversation, conversationCacheTTL)
}

// DeleteConversation removes conversation from cache
func (c *CacheService) DeleteConversation(conversationID uuid.UUID) error {
	key := fmt.Sprintf("%s%s", conversationPrefix, conversationID.String())
	return c.cache.Delete(key)
}

// GetConversationMembers retrieves conversation members from cache
func (c *CacheService) GetConversationMembers(conversationID uuid.UUID) ([]ConversationMember, error) {
	key := fmt.Sprintf("%s%s", conversationMembersPrefix, conversationID.String())
	var members []ConversationMember
	if err := c.cache.Get(key, &members); err != nil {
		return nil, err
	}
	return members, nil
}

// SetConversationMembers caches conversation members
func (c *CacheService) SetConversationMembers(conversationID uuid.UUID, members []ConversationMember) error {
	key := fmt.Sprintf("%s%s", conversationMembersPrefix, conversationID.String())
	return c.cache.Set(key, members, conversationMembersCacheTTL)
}

// DeleteConversationMembers removes conversation members from cache
func (c *CacheService) DeleteConversationMembers(conversationID uuid.UUID) error {
	key := fmt.Sprintf("%s%s", conversationMembersPrefix, conversationID.String())
	return c.cache.Delete(key)
}

// GetUserConversations retrieves user's conversation list from cache
func (c *CacheService) GetUserConversations(userID uuid.UUID) ([]ConversationByUser, error) {
	key := fmt.Sprintf("%s%s", userConversationsPrefix, userID.String())
	var conversations []ConversationByUser
	if err := c.cache.Get(key, &conversations); err != nil {
		return nil, err
	}
	return conversations, nil
}

// SetUserConversations caches user's conversation list
func (c *CacheService) SetUserConversations(userID uuid.UUID, conversations []ConversationByUser) error {
	key := fmt.Sprintf("%s%s", userConversationsPrefix, userID.String())
	return c.cache.Set(key, conversations, userConversationsCacheTTL)
}

// DeleteUserConversations removes user's conversation list from cache
func (c *CacheService) DeleteUserConversations(userID uuid.UUID) error {
	key := fmt.Sprintf("%s%s", userConversationsPrefix, userID.String())
	return c.cache.Delete(key)
}

// GetDirectConversation retrieves direct conversation ID from cache
func (c *CacheService) GetDirectConversation(user1ID, user2ID uuid.UUID) (*uuid.UUID, error) {
	// Ensure consistent ordering
	userA, userB := user1ID, user2ID
	if user1ID.String() > user2ID.String() {
		userA, userB = user2ID, user1ID
	}

	key := fmt.Sprintf("%s%s:%s", directConversationPrefix, userA.String(), userB.String())
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

// SetDirectConversation caches direct conversation ID
func (c *CacheService) SetDirectConversation(user1ID, user2ID, conversationID uuid.UUID) error {
	// Ensure consistent ordering
	userA, userB := user1ID, user2ID
	if user1ID.String() > user2ID.String() {
		userA, userB = user2ID, user1ID
	}

	key := fmt.Sprintf("%s%s:%s", directConversationPrefix, userA.String(), userB.String())
	return c.cache.Set(key, conversationID.String(), conversationCacheTTL)
}

// GetUnreadCount retrieves unread count for a user in a conversation
func (c *CacheService) GetUnreadCount(conversationID, userID uuid.UUID) (int, error) {
	key := fmt.Sprintf("%s%s:%s", conversationUnreadPrefix, conversationID.String(), userID.String())
	var count int
	if err := c.cache.Get(key, &count); err != nil {
		return 0, err
	}
	return count, nil
}

// SetUnreadCount caches unread count for a user in a conversation
func (c *CacheService) SetUnreadCount(conversationID, userID uuid.UUID, count int) error {
	key := fmt.Sprintf("%s%s:%s", conversationUnreadPrefix, conversationID.String(), userID.String())
	return c.cache.Set(key, count, userConversationsCacheTTL)
}

// IncrementUnreadCount increments unread count for a user in a conversation
func (c *CacheService) IncrementUnreadCount(conversationID, userID uuid.UUID) error {
	key := fmt.Sprintf("%s%s:%s", conversationUnreadPrefix, conversationID.String(), userID.String())
	_, err := c.cache.Increment(key)
	if err != nil {
		// If key doesn't exist, set it to 1
		return c.SetUnreadCount(conversationID, userID, 1)
	}
	// Set expiration
	return c.cache.SetExpire(key, userConversationsCacheTTL)
}

// ResetUnreadCount resets unread count for a user in a conversation
func (c *CacheService) ResetUnreadCount(conversationID, userID uuid.UUID) error {
	key := fmt.Sprintf("%s%s:%s", conversationUnreadPrefix, conversationID.String(), userID.String())
	return c.cache.Delete(key)
}

// InvalidateConversation clears all cache related to a conversation
func (c *CacheService) InvalidateConversation(conversationID uuid.UUID) error {
	// Delete conversation metadata
	if err := c.DeleteConversation(conversationID); err != nil {
		c.logger.Warnw("Failed to delete conversation cache", "conversation_id", conversationID, "error", err)
	}

	// Delete conversation members
	if err := c.DeleteConversationMembers(conversationID); err != nil {
		c.logger.Warnw("Failed to delete conversation members cache", "conversation_id", conversationID, "error", err)
	}

	return nil
}

// InvalidateUserConversations clears conversation list cache for multiple users
func (c *CacheService) InvalidateUserConversations(userIDs []uuid.UUID) error {
	for _, userID := range userIDs {
		if err := c.DeleteUserConversations(userID); err != nil {
			c.logger.Warnw("Failed to delete user conversations cache", "user_id", userID, "error", err)
		}
	}
	return nil
}
