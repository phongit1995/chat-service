package websocket

import (
	"chat-server/internal/constants"
	"chat-server/internal/services"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

type PresenceService struct {
	cache  *services.CacheService
	logger *zap.SugaredLogger
}

var addConnectionScript = redis.NewScript(`
	local key = KEYS[1]
	local ttl = ARGV[1]
	local count = redis.call('INCR', key)
	redis.call('EXPIRE', key, ttl)
	return count
`)

var removeConnectionScript = redis.NewScript(`
	local key = KEYS[1]
	local count = redis.call('DECR', key)
	if count <= 0 then
		redis.call('DEL', key)
		return 0
	end
	return count
`)

func NewPresenceService(cache *services.CacheService, logger *zap.SugaredLogger) *PresenceService {
	return &PresenceService{
		cache:  cache,
		logger: logger.Named("[presence_service]"),
	}
}

func (s *PresenceService) getPresenceKey(userID string) string {
	return fmt.Sprintf(constants.CacheKeyPresence, userID)
}

func (s *PresenceService) AddConnection(userID string) (bool, error) {
	key := s.getPresenceKey(userID)
	client := s.cache.GetClient()
	ctx := s.cache.GetContext()

	count, err := addConnectionScript.Run(ctx, client, []string{key}, constants.PresenceTTLSeconds).Int()
	if err != nil {
		s.logger.Errorw("Failed to add connection", "user_id", userID, "error", err)
		return false, err
	}

	if err := s.SetLastActive(userID); err != nil {
		s.logger.Warnw("Failed to set last_active on connect", "user_id", userID, "error", err)
	}

	isFirstConnection := count == 1
	s.logger.Debugw("Added connection",
		"user_id", userID,
		"connection_count", count,
		"is_first_connection", isFirstConnection)

	return isFirstConnection, nil
}

func (s *PresenceService) RemoveConnection(userID string) (bool, error) {
	key := s.getPresenceKey(userID)
	client := s.cache.GetClient()
	ctx := s.cache.GetContext()

	count, err := removeConnectionScript.Run(ctx, client, []string{key}).Int()
	if err != nil {
		s.logger.Errorw("Failed to remove connection", "user_id", userID, "error", err)
		return false, err
	}

	isLastConnection := count == 0
	if isLastConnection {
		if err := s.SetLastActive(userID); err != nil {
			s.logger.Warnw("Failed to set last_active on disconnect", "user_id", userID, "error", err)
		}
	}

	s.logger.Debugw("Removed connection",
		"user_id", userID,
		"remaining_connections", count,
		"is_last_connection", isLastConnection)

	return isLastConnection, nil
}

func (s *PresenceService) RefreshPresence(userID string) error {
	key := s.getPresenceKey(userID)
	return s.cache.SetExpire(key, time.Duration(constants.PresenceTTLSeconds)*time.Second)
}

func (s *PresenceService) IsUserOnline(userID string) bool {
	key := s.getPresenceKey(userID)
	exists, err := s.cache.Exists(key)
	if err != nil {
		return false
	}
	return exists
}

func (s *PresenceService) GetOnlineUsers(userIDs []string) map[string]bool {
	result := make(map[string]bool, len(userIDs))
	if len(userIDs) == 0 {
		return result
	}

	keys := make([]string, len(userIDs))
	for i, userID := range userIDs {
		keys[i] = s.getPresenceKey(userID)
	}

	client := s.cache.GetClient()
	ctx := s.cache.GetContext()

	values, err := client.MGet(ctx, keys...).Result()
	if err != nil {
		s.logger.Errorw("Failed to batch check online status", "error", err)
		return result
	}

	for i, val := range values {
		if val != nil {
			count, _ := strconv.Atoi(val.(string))
			result[userIDs[i]] = count > 0
		} else {
			result[userIDs[i]] = false
		}
	}

	return result
}

func (s *PresenceService) getLastActiveKey(userID string) string {
	return fmt.Sprintf(constants.CacheKeyLastActive, userID)
}

func (s *PresenceService) SetLastActive(userID string) error {
	key := s.getLastActiveKey(userID)
	client := s.cache.GetClient()
	ctx := s.cache.GetContext()
	now := time.Now().UTC().Format(time.RFC3339)
	if err := client.Set(ctx, key, now, time.Duration(constants.LastActiveTTLSeconds)*time.Second).Err(); err != nil {
		s.logger.Errorw("Failed to set last_active", "user_id", userID, "error", err)
		return err
	}
	return nil
}

func (s *PresenceService) GetLastActive(userID string) string {
	key := s.getLastActiveKey(userID)
	client := s.cache.GetClient()
	ctx := s.cache.GetContext()
	val, err := client.Get(ctx, key).Result()
	if err != nil {
		return ""
	}
	return val
}

func (s *PresenceService) GetLastActiveBatch(userIDs []string) map[string]string {
	result := make(map[string]string, len(userIDs))
	if len(userIDs) == 0 {
		return result
	}

	keys := make([]string, len(userIDs))
	for i, userID := range userIDs {
		keys[i] = s.getLastActiveKey(userID)
	}

	client := s.cache.GetClient()
	ctx := s.cache.GetContext()
	values, err := client.MGet(ctx, keys...).Result()
	if err != nil {
		s.logger.Errorw("Failed to batch get last_active", "error", err)
		return result
	}
	for i, val := range values {
		if val != nil {
			if str, ok := val.(string); ok {
				result[userIDs[i]] = str
			}
		}
	}
	return result
}

func (s *PresenceService) GetConnectionCount(userID string) int {
	key := s.getPresenceKey(userID)
	client := s.cache.GetClient()
	ctx := s.cache.GetContext()

	count, err := client.Get(ctx, key).Int()
	if err != nil {
		return 0
	}
	return count
}
