package websocket

import (
	"chat-server/internal/config"
	"chat-server/internal/constants"
	"chat-server/internal/services"
	"context"
	"fmt"
	"net/http"

	"github.com/redis/go-redis/v9"
	redisClient "github.com/zishang520/socket.io/adapters/redis/v3"
	"github.com/zishang520/socket.io/adapters/redis/v3/adapter"
	socket "github.com/zishang520/socket.io/servers/socket/v3"
	"go.uber.org/zap"
)

type Server struct {
	io              *socket.Server
	jwtService      *services.JWTService
	redisAdapter    *RedisAdapter
	presenceService *PresenceService
	logger          *zap.SugaredLogger
	redisClient     *redis.Client
}

type SocketData struct {
	UserID string
}

func NewServer(
	cfg *config.Config,
	jwtService *services.JWTService,
	redisAdapter *RedisAdapter,
	presenceService *PresenceService,
	logger *zap.SugaredLogger,
) (*Server, error) {
	rdb := redisAdapter.GetClient()

	wrappedRedisClient := redisClient.NewRedisClient(context.Background(), rdb)

	opts := socket.DefaultServerOptions()
	opts.SetAdapter(&adapter.RedisAdapterBuilder{
		Redis: wrappedRedisClient,
		Opts:  adapter.DefaultRedisAdapterOptions(),
	})

	io := socket.NewServer(nil, opts)

	server := &Server{
		io:              io,
		jwtService:      jwtService,
		redisAdapter:    redisAdapter,
		presenceService: presenceService,
		logger:          logger.Named("[websocket]"),
		redisClient:     rdb,
	}

	io.Use(func(s *socket.Socket, next func(*socket.ExtendedError)) {
		auth := s.Handshake().Auth
		tokenValue, exists := auth["token"]
		if !exists {
			req := s.Request()
			if tokenQuery, ok := req.Query().Get("token"); ok {
				tokenValue = tokenQuery
			}
		}

		if tokenValue == nil || tokenValue == "" {
			server.logger.Warn("WebSocket connection without token")
			next(socket.NewExtendedError("access_token is required", nil))
			return
		}

		token := ""
		switch v := tokenValue.(type) {
		case string:
			token = v
		default:
			server.logger.Warnw("Invalid token type", "type", fmt.Sprintf("%T", tokenValue))
			next(socket.NewExtendedError("invalid token format", nil))
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

	eventHandler := NewEventHandler(server, presenceService)
	eventHandler.RegisterEvents()

	logger.Info("✅ WebSocket server initialized with Socket.IO v3 + Redis Adapter + Presence Tracking")
	return server, nil
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.io.ServeHandler(nil).ServeHTTP(w, r)
}

func (s *Server) Close() {
	s.io.Close(nil)
	s.redisAdapter.Close()
}

func (s *Server) EmitUserOnlineStatus(userID string, isOnline bool) {
	data := map[string]any{
		"user_id":   userID,
		"is_online": isOnline,
	}
	if isOnline {
		s.io.Emit(constants.WebSocketEventUserOnline, data)
	} else {
		s.io.Emit(constants.WebSocketEventUserOffline, data)
	}
}

func (s *Server) EmitToUser(userID string, event string, data any) {
	room := "user:" + userID
	s.io.To(socket.Room(room)).Emit(event, data)
}

func (s *Server) EmitToUsers(userIDs []string, event string, data any) {
	for _, userID := range userIDs {
		s.EmitToUser(userID, event, data)
	}
}

func (s *Server) GetPresenceService() *PresenceService {
	return s.presenceService
}
