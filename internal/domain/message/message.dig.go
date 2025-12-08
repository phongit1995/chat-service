package message

import "go.uber.org/dig"

func Provider(c *dig.Container) error {

	providers := []interface{}{
		NewEventHandler,
	}

	for _, provider := range providers {
		if err := c.Provide(provider); err != nil {
			return err
		}
	}

	return nil
}
