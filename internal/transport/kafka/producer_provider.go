package kafka

import "go.uber.org/dig"

func ProvideProducer(c *dig.Container) error {
	if err := c.Provide(NewProducer); err != nil {
		return err
	}
	return nil
}
