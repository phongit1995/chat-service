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
	}

	for _, provider := range providers {
		if err := c.Provide(provider); err != nil {
			return err
		}
	}

	if err := c.Provide(func(a *ConversationCacheAdapter) websocket.ConversationMembersGetter {
		return a
	}); err != nil {
		return err
	}

	return nil
}
