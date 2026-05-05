package conversation

import (
	"chat-server/internal/transport/websocket"

	"go.uber.org/dig"
)

func Provider(c *dig.Container) error {
	providers := []interface{}{
		NewConversationCache,
		NewConversationCacheAdapter,
		NewEventHandler,
		func(a *ConversationCacheAdapter) websocket.ConversationMembersGetter { return a },
	}

	for _, provider := range providers {
		if err := c.Provide(provider); err != nil {
			return err
		}
	}

	return nil
}
