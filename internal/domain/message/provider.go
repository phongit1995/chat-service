package message

import "go.uber.org/dig"

func Provider(c *dig.Container) error {
	if err := c.Provide(NewConversationCacheAdapter); err != nil {
		return err
	}
	return c.Provide(NewEventHandler)
}
