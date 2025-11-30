package websocket

import (
	"chat-server/internal/config"
	"chat-server/internal/services"
	"context"
	"net/http"

	"github.com/redis/go-redis/v9"
	redisClient "github.com/zishang520/socket.io/adapters/redis/v3"
	"github.com/zishang520/socket.io/adapters/redis/v3/adapter"
	socket "github.com/zishang520/socket.io/servers/socket/v3"
	"go.uber.org/zap"
)

type Server struct {
	io           *socket.Server
	jwtService   *services.JWTService
	redisService *RedisService
	logger       *zap.SugaredLogger
	redisClient  *redis.Client
}

type SocketData struct {
	UserID string
}

func NewServer(
	cfg *config.Config,
	jwtService *services.JWTService,
	redisService *RedisService,
	logger *zap.SugaredLogger,
) (*Server, error) {
	rdb := redisService.GetClient()

	wrappedRedisClient := redisClient.NewRedisClient(context.Background(), rdb)

	opts := socket.DefaultServerOptions()
	opts.SetAdapter(&adapter.RedisAdapterBuilder{
		Redis: wrappedRedisClient,
		Opts:  adapter.DefaultRedisAdapterOptions(),
	})

	io := socket.NewServer(nil, opts)

	server := &Server{
		io:           io,
		jwtService:   jwtService,
		redisService: redisService,
		logger:       logger.Named("[websocket]"),
		redisClient:  rdb,
	}

	io.Use(func(s *socket.Socket, next func(*socket.ExtendedError)) {
		req := s.Request()
		token, ok := req.Query().Get("token")
		if !ok {
			token = ""
		}

		if token == "" {
			server.logger.Warn("WebSocket connection without token")
			next(socket.NewExtendedError("access_token is required", nil))
			return
		}

		userID, err := jwtService.GetUserIDFromToken(token)
		if err != nil {
			server.logger.Warnw("Invalid WebSocket token", "error", err)
			next(socket.NewExtendedError("Unauthorized", nil))
			return
		}

		data := &SocketData{UserID: userID.String()}
		s.SetData(data)

		server.logger.Infow("WebSocket authenticated", "user_id", userID)
		next(nil)
	})

	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		data := client.Data().(*SocketData)
		userId := data.UserID

		server.logger.Infow("WebSocket connected", "user_id", userId, "socket_id", client.Id())

		client.On("disconnect", func(args ...any) {
			server.logger.Infow("WebSocket disconnected", "user_id", userId, "socket_id", client.Id())
		})
	})

	logger.Info("✅ WebSocket server initialized with Socket.IO v3 + Redis Adapter")
	return server, nil
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.io.ServeHandler(nil).ServeHTTP(w, r)
}

func (s *Server) Close() {
	s.io.Close(nil)
	s.redisService.Close()
}

func (s *Server) EmitNewMessage(conversationID string, message any) {
	room := "conversation:" + conversationID
	s.io.To(socket.Room(room)).Emit("new_message", message)
	s.logger.Debugw("Emitted new_message", "conversation_id", conversationID)
}

func (s *Server) EmitMessageDeleted(conversationID, messageID string) {
	room := "conversation:" + conversationID
	data := map[string]any{
		"conversation_id": conversationID,
		"message_id":      messageID,
	}
	s.io.To(socket.Room(room)).Emit("message_deleted", data)
	s.logger.Debugw("Emitted message_deleted", "conversation_id", conversationID)
}

func (s *Server) EmitConversationUpdated(userIDs []string, conversation any) {
	for _, userID := range userIDs {
		room := "user:" + userID
		s.io.To(socket.Room(room)).Emit("conversation_updated", conversation)
	}
	s.logger.Debugw("Emitted conversation_updated", "user_count", len(userIDs))
}

func (s *Server) EmitUserOnlineStatus(userID string, isOnline bool) {
	data := map[string]any{
		"user_id":   userID,
		"is_online": isOnline,
	}
	s.io.Emit("user_status_changed", data)
}
