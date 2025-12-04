package kafka

import "go.uber.org/dig"

func ProvideConsumer(c *dig.Container) error {
	if err := c.Provide(NewConsumer); err != nil {
		return err
	}

	if err := c.Provide(NewHandlers); err != nil {
		return err
	}

	return nil
}
