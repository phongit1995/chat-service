package message

import (
	"chat-server/internal/modules/conversation"

	"github.com/google/uuid"
)

type ConversationCacheAdapter struct {
	cache *conversation.CacheService
}

func NewConversationCacheAdapter(cache *conversation.CacheService) *ConversationCacheAdapter {
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
