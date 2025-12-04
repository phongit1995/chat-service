package user

import "go.uber.org/dig"

func Provider(c *dig.Container) error {
	return c.Provide(NewEventHandler)
}
