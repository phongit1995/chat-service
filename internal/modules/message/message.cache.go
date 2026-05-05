package message

import (
	"chat-server/internal/constants"
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

func (c *CacheService) GetMessage(conversationID uuid.UUID, messageID gocql.UUID) (*Message, error) {
	key := fmt.Sprintf(constants.CacheKeyMessage, fmt.Sprintf("%s:%s", conversationID.String(), messageID.String()))
	var message Message
	if err := c.cache.Get(key, &message); err != nil {
		return nil, err
	}
	return &message, nil
}

func (c *CacheService) SetMessage(message *Message) error {
	key := fmt.Sprintf(constants.CacheKeyMessage, fmt.Sprintf("%s:%s", message.ConversationID.String(), message.MessageID.String()))
	return c.cache.Set(key, message, constants.CacheTTLMessage*time.Second)
}

func (c *CacheService) DeleteMessage(conversationID uuid.UUID, messageID gocql.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyMessage, fmt.Sprintf("%s:%s", conversationID.String(), messageID.String()))
	return c.cache.Delete(key)
}

func (c *CacheService) GetConversationMessages(conversationID uuid.UUID, limit int) ([]Message, error) {
	key := fmt.Sprintf(constants.CacheKeyMessageList, fmt.Sprintf("%s:limit_%d", conversationID.String(), limit))
	var messages []Message
	if err := c.cache.Get(key, &messages); err != nil {
		return nil, err
	}
	return messages, nil
}

func (c *CacheService) SetConversationMessages(conversationID uuid.UUID, limit int, messages []Message) error {
	key := fmt.Sprintf(constants.CacheKeyMessageList, fmt.Sprintf("%s:limit_%d", conversationID.String(), limit))
	return c.cache.Set(key, messages, constants.CacheTTLMessageList*time.Second)
}

func (c *CacheService) DeleteConversationMessages(conversationID uuid.UUID) error {
	pattern := fmt.Sprintf(constants.CacheKeyMessageList, conversationID.String()+"*")
	return c.cache.DeletePattern(pattern)
}

func (c *CacheService) GetLastMessage(conversationID uuid.UUID) (*Message, error) {
	key := fmt.Sprintf(constants.CacheKeyMessage, fmt.Sprintf("%s:last", conversationID.String()))
	var message Message
	if err := c.cache.Get(key, &message); err != nil {
		return nil, err
	}
	return &message, nil
}

func (c *CacheService) SetLastMessage(conversationID uuid.UUID, message *Message) error {
	key := fmt.Sprintf(constants.CacheKeyMessage, fmt.Sprintf("%s:last", conversationID.String()))
	return c.cache.Set(key, message, constants.CacheTTLMessage*time.Second)
}

func (c *CacheService) DeleteLastMessage(conversationID uuid.UUID) error {
	key := fmt.Sprintf(constants.CacheKeyMessage, fmt.Sprintf("%s:last", conversationID.String()))
	return c.cache.Delete(key)
}

func (c *CacheService) InvalidateConversationMessages(conversationID uuid.UUID) error {
	if err := c.DeleteConversationMessages(conversationID); err != nil {
		c.logger.Warnw("Failed to delete conversation messages cache", "conversation_id", conversationID, "error", err)
	}

	if err := c.DeleteLastMessage(conversationID); err != nil {
		c.logger.Warnw("Failed to delete last message cache", "conversation_id", conversationID, "error", err)
	}

	return nil
}

func (c *CacheService) CacheMessageBatch(messages []Message) error {
	for _, msg := range messages {
		if err := c.SetMessage(&msg); err != nil {
			c.logger.Warnw("Failed to cache message", "message_id", msg.MessageID, "error", err)
		}
	}
	return nil
}

func clientMsgIDKey(senderID uuid.UUID, clientMsgID string) string {
	return fmt.Sprintf("dedup:%s:%s", senderID.String(), clientMsgID)
}

func (c *CacheService) GetMessageByClientMsgID(senderID uuid.UUID, clientMsgID string) (*MessageResponse, error) {
	var resp MessageResponse
	if err := c.cache.Get(clientMsgIDKey(senderID, clientMsgID), &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *CacheService) SetMessageByClientMsgID(senderID uuid.UUID, clientMsgID string, resp *MessageResponse) error {
	return c.cache.Set(clientMsgIDKey(senderID, clientMsgID), resp, constants.CacheTTLClientMsgIDDedup*time.Second)
}
