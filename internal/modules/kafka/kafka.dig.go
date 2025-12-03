package kafka

import "go.uber.org/dig"

func Provider(c *dig.Container) error {
	if err := c.Provide(NewProducer); err != nil {
		return err
	}

	if err := c.Provide(NewConsumer); err != nil {
		return err
	}

	if err := c.Provide(NewHandlers); err != nil {
		return err
	}

	return nil
}
