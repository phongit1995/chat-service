package health

import "chat-server/internal/utils"

type Router struct {
	controller *Controller
}

func NewRouter(controller *Controller) *Router {
	return &Router{controller: controller}
}

func (r *Router) Setup(api *utils.AppGroup) {
	api.GET("/health", r.controller.HealthCheck)
}
