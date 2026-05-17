package message

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
	messages := router.Group("/messages")
	messages.Use(r.authMiddleware.RequireAuth())
	{
		messages.POST("", r.controller.SendMessage)
		messages.POST("/direct", r.controller.SendDirectMessage)
		messages.POST("/images", r.controller.SendImageMessage)
		messages.GET("/:conversationId", r.controller.GetMessages)
		messages.PATCH("/:conversationId/:messageId", r.controller.UpdateMessage)
		messages.DELETE("/:conversationId/:messageId", r.controller.DeleteMessage)
		messages.POST("/:conversationId/:messageId/reactions", r.controller.ToggleReaction)
	}
}
