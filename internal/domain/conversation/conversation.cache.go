package conversation

import (
	"chat-server/internal/constants"
	"chat-server/internal/services"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type ConversationMember struct {
	ConversationID uuid.UUID
	UserID         uuid.UUID
	JoinedAt       time.Time
	LeftAt         *time.Time
	IsActive       bool
	Role           string
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

	var members []ConversationMember
	if err := c.cache.Get(key, &members); err != nil {
		c.logger.Debugw("Cache miss for conversation members", "conversation_id", conversationID, "error", err)
		return nil, err
	}

	c.logger.Debugw("Cache hit for conversation members", "conversation_id", conversationID, "count", len(members))
	return members, nil
}

func (c *ConversationCache) SetConversationMembers(conversationID uuid.UUID, members []ConversationMember) error {
	key := fmt.Sprintf(constants.CacheKeyConversationMembers, conversationID.String())
	return c.cache.Set(key, members, constants.CacheTTLConversation*time.Second)
}


type ConversationCacheAdapter struct {
	cache  *ConversationCache
	db     *gorm.DB
	logger *zap.SugaredLogger
}

func NewConversationCacheAdapter(cache *ConversationCache, db *gorm.DB, logger *zap.SugaredLogger) *ConversationCacheAdapter {
	return &ConversationCacheAdapter{
		cache:  cache,
		db:     db,
		logger: logger.Named("[conv_cache_adapter]"),
	}
}

func (a *ConversationCacheAdapter) GetConversationMembers(conversationID string) ([]string, error) {
	convID, err := uuid.Parse(conversationID)
	if err != nil {
		return nil, err
	}

	// Try cache first
	members, err := a.cache.GetConversationMembers(convID)
	if err == nil && len(members) > 0 {
		userIDs := make([]string, 0, len(members))
		for _, member := range members {
			if member.IsActive {
				userIDs = append(userIDs, member.UserID.String())
			}
		}
		return userIDs, nil
	}

	// Cache miss — fallback to Postgres
	a.logger.Debugw("Cache miss for members, querying Postgres", "conversation_id", conversationID)
	var rows []struct {
		UserID   uuid.UUID
		IsActive bool
	}
	if err := a.db.Raw(
		"SELECT user_id, is_active FROM conversation_members WHERE conversation_id = ? AND is_active = true",
		convID,
	).Scan(&rows).Error; err != nil {
		a.logger.Errorw("Failed to query members from Postgres", "conversation_id", conversationID, "error", err)
		return nil, err
	}

	userIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		userIDs = append(userIDs, row.UserID.String())
	}

	// Backfill cache async
	go func() {
		cacheMembers := make([]ConversationMember, 0, len(rows))
		for _, row := range rows {
			cacheMembers = append(cacheMembers, ConversationMember{
				ConversationID: convID,
				UserID:         row.UserID,
				JoinedAt:       time.Now(),
				IsActive:       true,
			})
		}
		if err := a.cache.SetConversationMembers(convID, cacheMembers); err != nil {
			a.logger.Warnw("Failed to backfill members cache", "conversation_id", conversationID, "error", err)
		}
	}()

	return userIDs, nil
}
