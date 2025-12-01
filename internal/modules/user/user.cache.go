package user

import (
	"chat-server/internal/constants"
	"chat-server/internal/models"
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
		logger: logger.Named("[user_cache]"),
	}
}

func (c *CacheService) GetUser(userID uuid.UUID) (*models.User, error) {
	key := fmt.Sprintf(constants.CacheKeyUserProfile, userID.String())
	var user models.User
	if err := c.cache.Get(key, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

func (c *CacheService) SetUser(userID uuid.UUID, user *models.User) error {
	key := fmt.Sprintf(constants.CacheKeyUserProfile, userID.String())
	return c.cache.Set(key, user, constants.CacheTTLUserProfile*time.Second)
}

func (c *CacheService) DeleteUser(userID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyUserProfile, userID.String())
	return c.cache.Delete(key)
}

func (c *CacheService) SetUserSession(userID uuid.UUID, token string, expiry time.Duration) error {
	key := fmt.Sprintf(constants.CacheKeyUserSession, userID.String())
	return c.cache.Set(key, token, expiry)
}

func (c *CacheService) DeleteUserSession(userID uuid.UUID, token string) error {
	key := fmt.Sprintf(constants.CacheKeyUserSession, userID.String())
	return c.cache.Delete(key)
}

func (c *CacheService) DeleteAllUserSessions(userID uuid.UUID) error {
	pattern := fmt.Sprintf(constants.CacheKeyUserSession, userID.String())
	return c.cache.DeletePattern(pattern)
}

func (c *CacheService) SetUserOnlineStatus(userID uuid.UUID, isOnline bool) error {
	key := fmt.Sprintf(constants.CacheKeyUserOnlineStatus, userID.String())
	status := map[string]interface{}{
		"online":    isOnline,
		"timestamp": time.Now().Unix(),
	}
	return c.cache.Set(key, status, constants.CacheTTLUserOnlineStatus*time.Second)
}

func (c *CacheService) GetUserOnlineStatus(userID uuid.UUID) (bool, error) {
	key := fmt.Sprintf(constants.CacheKeyUserOnlineStatus, userID.String())
	var status map[string]interface{}
	if err := c.cache.Get(key, &status); err != nil {
		return false, err
	}
	if online, ok := status["online"].(bool); ok {
		return online, nil
	}
	return false, nil
}

func (c *CacheService) InvalidateUser(userID uuid.UUID) error {
	if err := c.DeleteUser(userID); err != nil {
		c.logger.Warnw("Failed to delete user cache", "user_id", userID, "error", err)
	}
	return nil
}
