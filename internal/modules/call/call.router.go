package call

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
	calls := router.Group("/calls")
	calls.Use(r.authMiddleware.RequireAuth())
	{
		calls.POST("/start", r.controller.StartCall)
		calls.POST("/:id/answer", r.controller.AnswerCall)
		calls.POST("/:id/decline", r.controller.DeclineCall)
		calls.POST("/:id/end", r.controller.EndCall)
	}

	router.POST("/calls/webhook", r.controller.LiveKitWebhook)
}
