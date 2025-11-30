package auth

import "chat-server/internal/utils"

type Router struct {
	controller *Controller
}

func NewRouter(controller *Controller) *Router {
	return &Router{controller: controller}
}

func (r *Router) Setup(api *utils.AppGroup) {
	auth := api.Group("/auth")
	{
		auth.POST("/register", r.controller.Register)
		auth.POST("/login", r.controller.Login)
	}
}
