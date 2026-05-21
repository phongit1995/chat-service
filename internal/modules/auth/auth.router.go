package auth

import (
	"chat-server/internal/middleware"
	"chat-server/internal/utils"
)

type Router struct {
	controller     *Controller
	authMiddleware *middleware.AuthMiddleware
}

func NewRouter(controller *Controller, authMiddleware *middleware.AuthMiddleware) *Router {
	return &Router{controller: controller, authMiddleware: authMiddleware}
}

func (r *Router) Setup(api *utils.AppGroup) {
	auth := api.Group("/auth")
	{
		auth.POST("/register", r.controller.Register)
		auth.POST("/login", r.controller.Login)
		auth.POST("/refresh", r.controller.Refresh)
		auth.POST("/logout", r.authMiddleware.RequireAuth(), r.controller.Logout)
		auth.POST("/change-password", r.authMiddleware.RequireAuth(), r.controller.ChangePassword)
	}
}
