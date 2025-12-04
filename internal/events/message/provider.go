package message

import "go.uber.org/dig"

func Provider(c *dig.Container) error {
	return c.Provide(NewEventHandler)
}
