package user

import (
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

const (
	userCachePrefix        = "user:"
	userProfileTTL         = 10 * time.Minute
	userByEmailPrefix      = "user:email:"
	userByUsernamePrefix   = "user:username:"
	userSessionPrefix      = "user:session:"
	userOnlineStatusPrefix = "user:online:"
)

// GetUser retrieves user from cache by ID
func (c *CacheService) GetUser(userID uuid.UUID) (*models.User, error) {
	key := fmt.Sprintf("%s%s", userCachePrefix, userID.String())
	var user models.User
	if err := c.cache.Get(key, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

// SetUser caches user data by ID
func (c *CacheService) SetUser(user *models.User) error {
	key := fmt.Sprintf("%s%s", userCachePrefix, user.ID.String())
	return c.cache.Set(key, user, userProfileTTL)
}

// DeleteUser removes user from cache
func (c *CacheService) DeleteUser(userID uuid.UUID) error {
	key := fmt.Sprintf("%s%s", userCachePrefix, userID.String())
	return c.cache.Delete(key)
}

// GetUserByEmail retrieves user ID from cache by email
func (c *CacheService) GetUserByEmail(email string) (*uuid.UUID, error) {
	key := fmt.Sprintf("%s%s", userByEmailPrefix, email)
	var userID string
	if err := c.cache.Get(key, &userID); err != nil {
		return nil, err
	}
	id, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

// SetUserByEmail caches user ID by email
func (c *CacheService) SetUserByEmail(email string, userID uuid.UUID) error {
	key := fmt.Sprintf("%s%s", userByEmailPrefix, email)
	return c.cache.Set(key, userID.String(), userProfileTTL)
}

// DeleteUserByEmail removes user email mapping from cache
func (c *CacheService) DeleteUserByEmail(email string) error {
	key := fmt.Sprintf("%s%s", userByEmailPrefix, email)
	return c.cache.Delete(key)
}

// GetUserByUsername retrieves user ID from cache by username
func (c *CacheService) GetUserByUsername(username string) (*uuid.UUID, error) {
	key := fmt.Sprintf("%s%s", userByUsernamePrefix, username)
	var userID string
	if err := c.cache.Get(key, &userID); err != nil {
		return nil, err
	}
	id, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

// SetUserByUsername caches user ID by username
func (c *CacheService) SetUserByUsername(username string, userID uuid.UUID) error {
	key := fmt.Sprintf("%s%s", userByUsernamePrefix, username)
	return c.cache.Set(key, userID.String(), userProfileTTL)
}

// DeleteUserByUsername removes user username mapping from cache
func (c *CacheService) DeleteUserByUsername(username string) error {
	key := fmt.Sprintf("%s%s", userByUsernamePrefix, username)
	return c.cache.Delete(key)
}

// SetUserSession caches user session data
func (c *CacheService) SetUserSession(userID uuid.UUID, token string, expiry time.Duration) error {
	key := fmt.Sprintf("%s%s:%s", userSessionPrefix, userID.String(), token)
	return c.cache.Set(key, "valid", expiry)
}

// DeleteUserSession removes user session from cache
func (c *CacheService) DeleteUserSession(userID uuid.UUID, token string) error {
	key := fmt.Sprintf("%s%s:%s", userSessionPrefix, userID.String(), token)
	return c.cache.Delete(key)
}

// DeleteAllUserSessions removes all sessions for a user
func (c *CacheService) DeleteAllUserSessions(userID uuid.UUID) error {
	pattern := fmt.Sprintf("%s%s:*", userSessionPrefix, userID.String())
	return c.cache.DeletePattern(pattern)
}

// SetUserOnlineStatus sets user online status
func (c *CacheService) SetUserOnlineStatus(userID uuid.UUID, isOnline bool) error {
	key := fmt.Sprintf("%s%s", userOnlineStatusPrefix, userID.String())
	status := map[string]interface{}{
		"online":    isOnline,
		"timestamp": time.Now().Unix(),
	}
	return c.cache.Set(key, status, 5*time.Minute)
}

// GetUserOnlineStatus gets user online status
func (c *CacheService) GetUserOnlineStatus(userID uuid.UUID) (bool, error) {
	key := fmt.Sprintf("%s%s", userOnlineStatusPrefix, userID.String())
	var status map[string]interface{}
	if err := c.cache.Get(key, &status); err != nil {
		return false, err
	}
	if online, ok := status["online"].(bool); ok {
		return online, nil
	}
	return false, nil
}

// InvalidateUser clears all cache related to a user
func (c *CacheService) InvalidateUser(user *models.User) error {
	// Delete user profile
	if err := c.DeleteUser(user.ID); err != nil {
		c.logger.Warnw("Failed to delete user cache", "user_id", user.ID, "error", err)
	}

	// Delete email mapping
	if err := c.DeleteUserByEmail(user.Email); err != nil {
		c.logger.Warnw("Failed to delete user email cache", "email", user.Email, "error", err)
	}

	// Delete username mapping
	if err := c.DeleteUserByUsername(user.Username); err != nil {
		c.logger.Warnw("Failed to delete user username cache", "username", user.Username, "error", err)
	}

	return nil
}
