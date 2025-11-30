package main

import (
	"chat-server/internal/modules/auth"
	"chat-server/internal/modules/conversation"
	"chat-server/internal/modules/health"
	"chat-server/internal/modules/message"
	"chat-server/internal/modules/relationships"
	"chat-server/internal/modules/user"
	"chat-server/internal/utils"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "chat-server/docs"
)

type Server struct {
	Router *gin.Engine
}

func CreateServer(authRouter *auth.Router, healthRouter *health.Router, userRouter *user.Router, relationshipsRouter *relationships.Router, conversationRouter *conversation.Router, messageRouter *message.Router) *Server {
	r := gin.Default()

	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler,
		ginSwagger.URL("/swagger/doc.json"),
		ginSwagger.DefaultModelsExpandDepth(-1)))

	apiGroup := r.Group("/api")
	api := utils.NewAppGroup(apiGroup)
	{
		healthRouter.Setup(api)
		authRouter.Setup(api)
		userRouter.Setup(api)
		relationshipsRouter.Setup(api)
		conversationRouter.Setup(api)
		messageRouter.Setup(api)
	}

	return &Server{Router: r}
}
