package message

import "go.uber.org/dig"

func Provider(container *dig.Container) error {

	providers := []interface{}{
		NewCacheService,
		NewRepository,
		NewService,
		NewController,
		NewRouter,
	}

	for _, provider := range providers {
		if err := container.Provide(provider); err != nil {
			return err
		}
	}

	return nil
}
