package message

import (
	"chat-server/internal/services"
	"fmt"
	"time"

	"github.com/gocql/gocql"
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
		logger: logger.Named("[message_cache]"),
	}
}

const (
	messagePrefix              = "message:"
	conversationMessagesPrefix = "conversation:messages:"
	lastMessagePrefix          = "conversation:last_message:"
	messageCacheTTL            = 30 * time.Minute
	messageListCacheTTL        = 5 * time.Minute
	lastMessageCacheTTL        = 10 * time.Minute
)

// GetMessage retrieves a message from cache
func (c *CacheService) GetMessage(conversationID uuid.UUID, messageID gocql.UUID) (*Message, error) {
	key := fmt.Sprintf("%s%s:%s", messagePrefix, conversationID.String(), messageID.String())
	var message Message
	if err := c.cache.Get(key, &message); err != nil {
		return nil, err
	}
	return &message, nil
}

// SetMessage caches a message
func (c *CacheService) SetMessage(message *Message) error {
	key := fmt.Sprintf("%s%s:%s", messagePrefix, message.ConversationID.String(), message.MessageID.String())
	return c.cache.Set(key, message, messageCacheTTL)
}

// DeleteMessage removes a message from cache
func (c *CacheService) DeleteMessage(conversationID uuid.UUID, messageID gocql.UUID) error {
	key := fmt.Sprintf("%s%s:%s", messagePrefix, conversationID.String(), messageID.String())
	return c.cache.Delete(key)
}

// GetConversationMessages retrieves conversation messages from cache
func (c *CacheService) GetConversationMessages(conversationID uuid.UUID, limit int) ([]Message, error) {
	key := fmt.Sprintf("%s%s:limit_%d", conversationMessagesPrefix, conversationID.String(), limit)
	var messages []Message
	if err := c.cache.Get(key, &messages); err != nil {
		return nil, err
	}
	return messages, nil
}

// SetConversationMessages caches conversation messages
func (c *CacheService) SetConversationMessages(conversationID uuid.UUID, limit int, messages []Message) error {
	key := fmt.Sprintf("%s%s:limit_%d", conversationMessagesPrefix, conversationID.String(), limit)
	return c.cache.Set(key, messages, messageListCacheTTL)
}

// DeleteConversationMessages removes conversation messages from cache
func (c *CacheService) DeleteConversationMessages(conversationID uuid.UUID) error {
	pattern := fmt.Sprintf("%s%s:*", conversationMessagesPrefix, conversationID.String())
	return c.cache.DeletePattern(pattern)
}

// GetLastMessage retrieves the last message info from cache
func (c *CacheService) GetLastMessage(conversationID uuid.UUID) (*Message, error) {
	key := fmt.Sprintf("%s%s", lastMessagePrefix, conversationID.String())
	var message Message
	if err := c.cache.Get(key, &message); err != nil {
		return nil, err
	}
	return &message, nil
}

// SetLastMessage caches the last message info
func (c *CacheService) SetLastMessage(conversationID uuid.UUID, message *Message) error {
	key := fmt.Sprintf("%s%s", lastMessagePrefix, conversationID.String())
	return c.cache.Set(key, message, lastMessageCacheTTL)
}

// DeleteLastMessage removes last message from cache
func (c *CacheService) DeleteLastMessage(conversationID uuid.UUID) error {
	key := fmt.Sprintf("%s%s", lastMessagePrefix, conversationID.String())
	return c.cache.Delete(key)
}

// InvalidateConversationMessages clears all message cache for a conversation
func (c *CacheService) InvalidateConversationMessages(conversationID uuid.UUID) error {
	// Delete all conversation messages
	if err := c.DeleteConversationMessages(conversationID); err != nil {
		c.logger.Warnw("Failed to delete conversation messages cache", "conversation_id", conversationID, "error", err)
	}

	// Delete last message
	if err := c.DeleteLastMessage(conversationID); err != nil {
		c.logger.Warnw("Failed to delete last message cache", "conversation_id", conversationID, "error", err)
	}

	return nil
}

// CacheMessageBatch caches multiple messages at once
func (c *CacheService) CacheMessageBatch(messages []Message) error {
	for _, msg := range messages {
		if err := c.SetMessage(&msg); err != nil {
			c.logger.Warnw("Failed to cache message", "message_id", msg.MessageID, "error", err)
		}
	}
	return nil
}
