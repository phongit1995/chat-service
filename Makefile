.PHONY: dev-up dev-down dev-logs dev-clean dev-restart kill-port docker-build docker-run docker-compose-up docker-compose-down docker-compose-logs

dev-up:
	docker compose -f docker-compose.dev.yml up -d

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

dev-clean:
	docker compose -f docker-compose.dev.yml down -v
	docker system prune -f

dev-restart:
	docker compose -f docker-compose.dev.yml restart

db-logs:
	docker compose -f docker-compose.dev.yml logs -f postgres

redis-logs:
	docker compose -f docker-compose.dev.yml logs -f redis

dev-status:
	docker compose -f docker-compose.dev.yml ps

db-shell:
	docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d chat_server_dev

redis-cli:
	docker compose -f docker-compose.dev.yml exec redis redis-cli -a redis123

build:
	go build -o bin/api ./cmd/api

run:
	@lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	go run ./cmd/api

mod-tidy:
	go mod tidy

mod-download:
	go mod download

swagger:
	~/go/bin/swag init -g cmd/api/main.go -o docs

kill-port:
	@echo "🔪 Killing process on port 8080..."
	@lsof -ti:8080 | xargs kill -9 2>/dev/null && echo "✅ Port 8080 freed" || echo "ℹ️  No process running on port 8080"

docker-build:
	@echo "🐳 Building Docker image..."
	docker build -t chat-server-api:latest .

docker-run:
	@echo "🚀 Running Docker container..."
	docker run --rm \
		--network chat-server_default \
		-p 8080:8080 \
		-e DB_HOST=chat-server-postgres-dev \
		-e DB_PORT=5432 \
		-e DB_NAME=chat_server_dev \
		-e DB_USER=postgres \
		-e DB_PASSWORD=postgres123 \
		-e DB_SSL_MODE=disable \
		-e REDIS_HOST=chat-server-redis-dev \
		-e REDIS_PORT=6379 \
		-e REDIS_PASSWORD=redis123 \
		-e REDIS_DB=0 \
		-e SERVER_PORT=8080 \
		-e SERVER_HOST=0.0.0.0 \
		-e GIN_MODE=debug \
		-e JWT_SECRET=your-jwt-secret-change-in-production-must-be-at-least-32-chars \
		-e JWT_EXPIRY=24h \
		-e CORS_ALLOWED_ORIGINS=http://localhost:3000 \
		-e WS_READ_BUFFER_SIZE=1024 \
		-e WS_WRITE_BUFFER_SIZE=1024 \
		chat-server-api:latest

docker-compose-up:
	docker-compose up -d

docker-compose-down:
	docker-compose down

docker-compose-logs:
	docker-compose logs -f

help:
	@echo "Available commands:"
	@echo "  dev-up        - Start development environment"
	@echo "  dev-down      - Stop development environment"
	@echo "  dev-logs      - View logs from all services"
	@echo "  dev-clean     - Stop and remove all containers + volumes"
	@echo "  dev-restart   - Restart all services"
	@echo "  dev-status    - Show status of all services"
	@echo "  db-shell      - Connect to PostgreSQL shell"
	@echo "  redis-cli     - Connect to Redis CLI"
	@echo "  build         - Build Go application"
	@echo "  run           - Run Go application (auto kill port 8080)"
	@echo "  mod-tidy      - Tidy Go modules"
	@echo "  swagger       - Generate swagger documentation"
	@echo "  kill-port     - Kill process on port 8080"
	@echo ""
	@echo "Docker commands:"
	@echo "  docker-build        - Build Docker image"
	@echo "  docker-run          - Run Docker container"
	@echo "  docker-compose-up   - Start full stack with docker-compose"
	@echo "  docker-compose-down - Stop docker-compose stack"
	@echo "  docker-compose-logs - View docker-compose logs"
	@echo ""
	@echo "  help          - Show this help message"
