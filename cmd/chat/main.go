package main

import (
	"chat-server/internal/config"
	"chat-server/internal/transport/kafka"
	"chat-server/internal/transport/websocket"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	c, err := NewContainer()
	if err != nil {
		log.Fatalf("❌ Failed to initialize container: %v", err)
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	errChan := make(chan error, 1)

	var wsServer *websocket.Server
	var kafkaConsumer *kafka.Consumer
	var srv *http.Server

	go func() {
		if err := c.Invoke(func(ws *websocket.Server, consumer *kafka.Consumer, adapter *kafka.KafkaEventAdapter, cfg *config.Config) error {
			wsServer = ws
			kafkaConsumer = consumer

			kafka.RegisterEventHandlers(consumer, adapter)

			if err := consumer.Start(); err != nil {
				return err
			}

			mux := http.NewServeMux()
			mux.HandleFunc("/socket.io/", func(w http.ResponseWriter, r *http.Request) {
				ws.ServeHTTP(w, r)
			})

			addr := fmt.Sprintf(":%d", cfg.ChatPort)
			srv = &http.Server{
				Addr:    addr,
				Handler: mux,
			}

			log.Println("🚀 Chat Service started")
			log.Printf("🔌 WebSocket server listening on ws://localhost%s/socket.io/\n", addr)
			log.Println("📨 Kafka consumer started")
			log.Println("👉 Press Ctrl+C to stop service")

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
		log.Fatalf("❌ Chat Service error: %v", err)
	case sig := <-quit:
		log.Printf("📡 Received signal: %v", sig)
		log.Println("🛑 Chat Service shutdown...")

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		shutdownDone := make(chan bool, 1)

		go func() {
			if srv != nil {
				log.Println("🌐 Shutting down HTTP server...")
				if err := srv.Shutdown(shutdownCtx); err != nil {
					log.Printf("⚠️ Error shutting down HTTP server: %v", err)
				} else {
					log.Println("✅ HTTP server shut down")
				}
			}

			if wsServer != nil {
				log.Println("🔌 Closing WebSocket connections...")
				wsServer.Close()
				log.Println("✅ WebSocket server closed")
			}

			if kafkaConsumer != nil {
				log.Println("📨 Closing Kafka consumer...")
				if err := kafkaConsumer.Close(); err != nil {
					log.Printf("⚠️ Error closing Kafka consumer: %v", err)
				} else {
					log.Println("✅ Kafka consumer closed")
				}
			}

			shutdownDone <- true
		}()

		select {
		case <-shutdownDone:
			log.Println("✅ Chat Service shutdown successfully!")
		case <-shutdownCtx.Done():
			log.Println("⚠️ Shutdown timeout exceeded, forcing exit...")
		}
	}
}
