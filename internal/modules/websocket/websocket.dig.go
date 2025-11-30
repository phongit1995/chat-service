package websocket

import "go.uber.org/dig"

func Provider(c *dig.Container) error {

	providers := []interface{}{
		NewRedisService,
		NewServer,
		NewKafkaHandlers,
	}

	for _, provider := range providers {
		if err := c.Provide(provider); err != nil {
			return err
		}
	}

	return nil
}
