package call

import "go.uber.org/dig"

func Provider(container *dig.Container) error {
	return container.Provide(NewEventHandler)
}
