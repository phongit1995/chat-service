package health

import "go.uber.org/dig"

func Provider(c *dig.Container) error {

	providers := []interface{}{
		NewService,
		NewController,
		NewRouter,
	}

	for _, provider := range providers {
		if err := c.Provide(provider); err != nil {
			return err
		}
	}

	return nil
}
