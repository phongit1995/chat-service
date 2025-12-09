package conversation

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

func (r *Router) Setup(router *utils.AppGroup) {
	conversations := router.Group("/conversations")
	conversations.Use(r.authMiddleware.RequireAuth())
	{
		conversations.GET("/direct/check", r.controller.CheckDirectConversation)
		conversations.POST("/direct", r.controller.CreateDirectConversation)
		conversations.POST("/group", r.controller.CreateGroupConversation)
		conversations.GET("", r.controller.GetUserConversations)
		conversations.PUT("/:id/read", r.controller.MarkConversationAsRead)
		conversations.POST("/:id/hide", r.controller.HideConversation)
		conversations.POST("/:id/unhide", r.controller.UnhideConversation)
		conversations.POST("/typing", r.controller.SendTypingIndicator)
	}
}
