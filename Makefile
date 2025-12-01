.PHONY: dev-up dev-down dev-logs dev-clean dev-status \
        run run-api run-chat build build-api build-chat \
        db-shell redis-cli scylla-cli kafka-cli \
        swagger mod-tidy help

# ==================== Development Environment ====================

dev-up:
	@echo "🚀 Starting development infrastructure..."
	docker compose -f docker-compose.dev.yml up -d

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

dev-clean:
	docker compose -f docker-compose.dev.yml down -v
	docker system prune -f

dev-status:
	docker compose -f docker-compose.dev.yml ps

# ==================== Run Services ====================

run: run-api run-chat

run-api:
	@echo "🚀 Starting API Service on :8080..."
	go run ./cmd/api

run-chat:
	@echo "🚀 Starting Chat Service..."
	go run ./cmd/chat

run-all:
	@echo "🚀 Starting all services..."
	@make run-api & make run-chat & wait

# ==================== Build ====================

build: build-api build-chat

build-api:
	@echo "🔨 Building API Service..."
	go build -o bin/api ./cmd/api

build-chat:
	@echo "🔨 Building Chat Service..."
	go build -o bin/chat ./cmd/chat

# ==================== Database CLI ====================

db-shell:
	docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d chat_server_dev

redis-cli:
	docker compose -f docker-compose.dev.yml exec redis redis-cli -a redis123

scylla-cli:
	docker compose -f docker-compose.dev.yml exec scylladb cqlsh

kafka-cli:
	docker compose -f docker-compose.dev.yml exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic chat.message.created

# ==================== Tools ====================

swagger:
	~/go/bin/swag init -g cmd/api/main.go -o docs

mod-tidy:
	go mod tidy

# ==================== Help ====================

help:
	@echo ""
	@echo "📦 Development Environment:"
	@echo "  make dev-up      - Start infrastructure (postgres, redis, scylla, kafka)"
	@echo "  make dev-down    - Stop infrastructure"
	@echo "  make dev-logs    - View infrastructure logs"
	@echo "  make dev-clean   - Remove all containers and volumes"
	@echo "  make dev-status  - Show container status"
	@echo ""
	@echo "🚀 Run Services:"
	@echo "  make run-api     - Run API service only"
	@echo "  make run-chat    - Run Chat service only"
	@echo "  make run-all     - Run both services in background"
	@echo ""
	@echo "🔨 Build:"
	@echo "  make build       - Build both services"
	@echo "  make build-api   - Build API service"
	@echo "  make build-chat  - Build Chat service"
	@echo ""
	@echo "🗄️  Database CLI:"
	@echo "  make db-shell    - PostgreSQL shell"
	@echo "  make redis-cli   - Redis CLI"
	@echo "  make scylla-cli  - ScyllaDB CQL shell"
	@echo "  make kafka-cli   - Kafka consumer (message.created topic)"
	@echo ""
	@echo "🛠️  Tools:"
	@echo "  make swagger     - Generate Swagger docs"
	@echo "  make mod-tidy    - Tidy Go modules"
	@echo ""
