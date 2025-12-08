package conversation

import (
	"chat-server/internal/constants"
	"chat-server/internal/services"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

type ConversationMember struct {
	UserID   uuid.UUID `json:"user_id"`
	IsActive bool      `json:"is_active"`
}

type ConversationCache struct {
	cache  *services.CacheService
	logger *zap.SugaredLogger
}

func NewConversationCache(cache *services.CacheService, logger *zap.SugaredLogger) *ConversationCache {
	return &ConversationCache{
		cache:  cache,
		logger: logger.Named("[conversation_cache]"),
	}
}

func (c *ConversationCache) GetConversationMembers(conversationID uuid.UUID) ([]ConversationMember, error) {
	key := fmt.Sprintf(constants.CacheKeyConversationMembers, conversationID.String())

	var data string
	if err := c.cache.Get(key, &data); err != nil {
		c.logger.Debugw("Cache miss for conversation members", "conversation_id", conversationID, "error", err)
		return nil, err
	}

	var members []ConversationMember
	if err := json.Unmarshal([]byte(data), &members); err != nil {
		c.logger.Errorw("Failed to unmarshal conversation members", "conversation_id", conversationID, "error", err)
		return nil, err
	}

	c.logger.Debugw("Cache hit for conversation members", "conversation_id", conversationID, "count", len(members))
	return members, nil
}

type ConversationCacheAdapter struct {
	cache *ConversationCache
}

func NewConversationCacheAdapter(cache *ConversationCache) *ConversationCacheAdapter {
	return &ConversationCacheAdapter{
		cache: cache,
	}
}

func (a *ConversationCacheAdapter) GetConversationMembers(conversationID string) ([]string, error) {
	convID, err := uuid.Parse(conversationID)
	if err != nil {
		return nil, err
	}

	members, err := a.cache.GetConversationMembers(convID)
	if err != nil {
		return nil, err
	}

	userIDs := make([]string, 0, len(members))
	for _, member := range members {
		if member.IsActive {
			userIDs = append(userIDs, member.UserID.String())
		}
	}

	return userIDs, nil
}
