package kafka

import (
	conversationEvents "chat-server/internal/events/conversation"
	messageEvents "chat-server/internal/events/message"
	userEvents "chat-server/internal/events/user"

	"go.uber.org/dig"
)

func ProvideConsumer(c *dig.Container) error {
	providers := []interface{}{
		NewConsumer,
		NewKafkaEventAdapter,
	}

	for _, provider := range providers {
		if err := c.Provide(provider); err != nil {
			return err
		}
	}

	modules := []func(*dig.Container) error{
		messageEvents.Provider,
		conversationEvents.Provider,
		userEvents.Provider,
	}

	for _, module := range modules {
		if err := module(c); err != nil {
			return err
		}
	}

	return nil
}
