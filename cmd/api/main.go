package main

import (
	"chat-server/internal/modules/websocket"
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
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

	if err := c.Invoke(func(db *gorm.DB) error {
		return nil
	}); err != nil {
		log.Fatalf("❌ Failed to migrate database: %v", err)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	errChan := make(chan error, 1)
	var srv *http.Server
	var wsServer *websocket.Server

	go func() {
		if err := c.Invoke(func(s *Server, ws *websocket.Server) error {
			wsServer = ws

			s.Router.Any("/socket.io/*any", func(c *gin.Context) {
				ws.ServeHTTP(c.Writer, c.Request)
			})

			srv = &http.Server{
				Addr:    ":8080",
				Handler: s.Router,
			}

			log.Println("🚀 Server running on :8080")
			log.Println("🔌 WebSocket server available at ws://localhost:8080/socket.io/")
			log.Println("👉 Press Ctrl+C to stop server")

			if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
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
		log.Println("🛑 Server shutdown...")

		if wsServer != nil {
			log.Println("🔌 Closing WebSocket connections...")
			wsServer.Close()
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Fatalf("❌ Server shutdown error: %v", err)
		}

		log.Println("✅ Server shutdown successfully!")
	}
}
