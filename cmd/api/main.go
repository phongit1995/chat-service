package main

import (
	"chat-server/internal/config"
	"chat-server/internal/infra/websocket"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gorm.io/gorm"
)

// @title           Chat Server API
// @version         1.0
// @description     A chat server API with authentication and real-time messaging
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.email  support@chatserver.com

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @BasePath  /api
// @schemes   http https

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	c, err := NewContainer()
	if err != nil {
		log.Fatalf("❌ Failed to initialize container: %v", err)
	}

	// Validate được gọi trong LoadAPIConfig() -> container init
	// Kiểm tra database connection
	if err := c.Invoke(func(db *gorm.DB) error {
		return nil
	}); err != nil {
		log.Fatalf("❌ Failed to connect database: %v", err)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	errChan := make(chan error, 1)

	type serverContext struct {
		srv      *http.Server
		wsServer *websocket.Server
	}
	var srvCtx serverContext

	go func() {
		if err := c.Invoke(func(s *Server, ws *websocket.Server, cfg *config.Config) error {
			srvCtx.wsServer = ws

			addr := fmt.Sprintf(":%d", cfg.ServerPort)
			srvCtx.srv = &http.Server{
				Addr:    addr,
				Handler: s.Router,
			}

			log.Println("🚀 API Service started")
			log.Printf("📡 HTTP REST API running on %s\n", addr)
			log.Printf("🔌 WebSocket server available at ws://localhost%s/socket.io/\n", addr)
			log.Println("📤 Kafka Producer ready")
			log.Println("👉 Press Ctrl+C to stop server")

			if err := srvCtx.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				return err
			}
			return nil
		}); err != nil {
			errChan <- err
		}
	}()

	select {
	case err := <-errChan:
		log.Fatalf("❌ Server error: %v", err)
	case sig := <-quit:
		log.Printf("📡 Received signal: %v", sig)
		log.Println("🛑 API Service shutdown...")

		if srvCtx.wsServer != nil {
			log.Println("🔌 Closing WebSocket connections...")
			srvCtx.wsServer.Close()
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := srvCtx.srv.Shutdown(ctx); err != nil {
			log.Fatalf("❌ Server shutdown error: %v", err)
		}

		log.Println("✅ API Service shutdown successfully!")
	}
}
