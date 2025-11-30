package relationships

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
	relationships := api.Group("/relationships", r.authMiddleware.RequireAuth())
	{
		relationships.POST("/request", r.controller.SendFriendRequest)

		relationships.PUT("/:id/respond", r.controller.RespondToFriendRequest)

		relationships.DELETE("/:id/cancel", r.controller.CancelFriendRequest)

		relationships.DELETE("/:id/unfriend", r.controller.Unfriend)

		relationships.POST("/block", r.controller.BlockUser)

		relationships.DELETE("/:id/unblock", r.controller.UnblockUser)

		relationships.GET("/pending", r.controller.GetPendingRequests)
		relationships.GET("/sent", r.controller.GetSentRequests)
		relationships.GET("/friends", r.controller.GetFriends)
		relationships.GET("/blocked", r.controller.GetBlockedUsers)
	}
}
