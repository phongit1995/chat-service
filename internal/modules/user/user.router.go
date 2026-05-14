package user

import (
	"chat-server/internal/middleware"
	"chat-server/internal/utils"
)

type Router struct {
	controller     *Controller
	authMiddleware *middleware.AuthMiddleware
}

func NewRouter(controller *Controller, authMiddleware *middleware.AuthMiddleware) *Router {
	return &Router{
		controller:     controller,
		authMiddleware: authMiddleware,
	}
}

func (r *Router) Setup(api *utils.AppGroup) {
	user := api.Group("/user", r.authMiddleware.RequireAuth())
	{
		user.GET("/me", r.controller.GetProfile)
		user.PUT("/me", r.controller.UpdateProfile)
		user.POST("/upload", r.controller.Upload)
		user.GET("/search", r.controller.SearchUsers)
		user.GET("/:id", r.controller.GetUserInfo)
	}
}
