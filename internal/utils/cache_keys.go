package utils

import (
	"chat-server/internal/constants"
	"fmt"
)

type CacheKeyBuilder struct{}

func NewCacheKeyBuilder() *CacheKeyBuilder {
	return &CacheKeyBuilder{}
}

func (b *CacheKeyBuilder) UserProfile(userID string) string {
	return fmt.Sprintf(constants.CacheKeyUserProfile, userID)
}

func (b *CacheKeyBuilder) UserOnlineStatus(userID string) string {
	return fmt.Sprintf(constants.CacheKeyUserOnlineStatus, userID)
}

func (b *CacheKeyBuilder) UserSession(userID string) string {
	return fmt.Sprintf(constants.CacheKeyUserSession, userID)
}

func (b *CacheKeyBuilder) UserRefreshToken(userID string) string {
	return fmt.Sprintf(constants.CacheKeyUserRefreshToken, userID)
}

func (b *CacheKeyBuilder) Conversation(conversationID string) string {
	return fmt.Sprintf(constants.CacheKeyConversation, conversationID)
}

func (b *CacheKeyBuilder) ConversationList(userID string) string {
	return fmt.Sprintf(constants.CacheKeyConversationList, userID)
}

func (b *CacheKeyBuilder) ConversationMembers(conversationID string) string {
	return fmt.Sprintf(constants.CacheKeyConversationMembers, conversationID)
}

func (b *CacheKeyBuilder) Message(messageID string) string {
	return fmt.Sprintf(constants.CacheKeyMessage, messageID)
}

func (b *CacheKeyBuilder) MessageList(conversationID string) string {
	return fmt.Sprintf(constants.CacheKeyMessageList, conversationID)
}

func (b *CacheKeyBuilder) Relationship(relationshipID string) string {
	return fmt.Sprintf(constants.CacheKeyRelationship, relationshipID)
}

func (b *CacheKeyBuilder) RelationshipList(userID string) string {
	return fmt.Sprintf(constants.CacheKeyRelationshipList, userID)
}

func (b *CacheKeyBuilder) UnreadCount(key string) string {
	return fmt.Sprintf(constants.CacheKeyUnreadCount, key)
}

func (b *CacheKeyBuilder) TypingUsers(conversationID string) string {
	return fmt.Sprintf(constants.CacheKeyTypingUsers, conversationID)
}

func (b *CacheKeyBuilder) RateLimitLogin(identifier string) string {
	return fmt.Sprintf(constants.CacheKeyRateLimitLogin, identifier)
}

func (b *CacheKeyBuilder) RateLimitRegister(identifier string) string {
	return fmt.Sprintf(constants.CacheKeyRateLimitRegister, identifier)
}

func (b *CacheKeyBuilder) RateLimitAPI(identifier string) string {
	return fmt.Sprintf(constants.CacheKeyRateLimitAPI, identifier)
}

func (b *CacheKeyBuilder) OTPVerification(identifier string) string {
	return fmt.Sprintf(constants.CacheKeyOTPVerification, identifier)
}

func (b *CacheKeyBuilder) PasswordResetToken(token string) string {
	return fmt.Sprintf(constants.CacheKeyPasswordResetToken, token)
}
