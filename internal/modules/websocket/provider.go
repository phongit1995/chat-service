package websocket

import "go.uber.org/dig"

func RegisterModule(c *dig.Container) error {
	if err := c.Provide(NewRedisService); err != nil {
		return err
	}

	if err := c.Provide(NewServer); err != nil {
		return err
	}

	return nil
}
