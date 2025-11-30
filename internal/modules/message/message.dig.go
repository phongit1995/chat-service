package message

import "go.uber.org/dig"

func RegisterModule(container *dig.Container) error {
	if err := container.Provide(NewCacheService); err != nil {
		return err
	}
	if err := container.Provide(NewRepository); err != nil {
		return err
	}
	if err := container.Provide(NewService); err != nil {
		return err
	}
	if err := container.Provide(NewController); err != nil {
		return err
	}
	if err := container.Provide(NewRouter); err != nil {
		return err
	}
	return nil
}
