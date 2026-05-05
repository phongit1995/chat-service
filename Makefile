.PHONY: dev-up dev-down dev-logs dev-clean dev-status \
        run run-api run-chat build build-api build-chat build-migrate build-seed \
        migrate-up migrate-down migrate-version migrate-create migrate-run \
        seed \
        db-shell redis-cli scylla-cli kafka-cli \
        web-install web-dev web-build web-preview web-clean \
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
	@mkdir -p logs
	go run ./cmd/api 2>&1 | tee logs/api.log

run-chat:
	@echo "🚀 Starting Chat Service..."
	@mkdir -p logs
	go run ./cmd/chat 2>&1 | tee logs/chat.log

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

build-migrate:
	@echo "🔨 Building Migration Service..."
	go build -o bin/migrate ./cmd/migrations

build-seed:
	@echo "🔨 Building Seed Service..."
	go build -o bin/seed ./cmd/seed

# ==================== Database Migrations ====================

migrate-up:
	@echo "⬆️  Running database migrations (UP)..."
	@go run ./cmd/migrations up all

migrate-down:
	@echo "⬇️  Rolling back database migrations (DOWN)..."
	@read -p "How many steps to rollback? (default: 1): " steps; \
	MIGRATION_STEPS=$${steps:-1} go run ./cmd/migrations down all

migrate-version:
	@echo "📊 Checking migration versions..."
	@go run ./cmd/migrations version all

migrate-create:
	@echo "📝 Creating new migration..."
	@read -p "Enter migration name (e.g., add_user_status): " name; \
	if [ -z "$$name" ]; then echo "❌ Migration name is required"; exit 1; fi; \
	echo "Creating PostgreSQL migration..."; \
	migrate create -ext sql -dir cmd/migrations/postgres $$name; \
	sleep 1; \
	echo "Creating ScyllaDB migration..."; \
	migrate create -ext cql -dir cmd/migrations/scylla $$name

migrate-run:
	@echo "🚀 Running migrations via Docker..."
	@docker compose up migrate

# ==================== Database Seeds ====================

seed:
	@echo "🌱 Seeding database with test users..."
	@go run ./cmd/migrations seed

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

# ==================== Web UI ====================

web-install:
	@echo "📦 Installing web dependencies..."
	cd clients/web && yarn install

web-dev:
	@echo "🌐 Starting web UI development server on :3000..."
	cd clients/web && yarn dev

web-build:
	@echo "🔨 Building web UI for production..."
	cd clients/web && yarn build

web-preview:
	@echo "👀 Previewing web UI production build..."
	cd clients/web && yarn preview

web-clean:
	@echo "🧹 Cleaning web UI..."
	cd clients/web && rm -rf node_modules dist .vite

web-lint:
	@echo "🔍 Linting web UI..."
	cd clients/web && yarn lint

run-web: web-dev

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
	@echo "  make build         - Build both services"
	@echo "  make build-api     - Build API service"
	@echo "  make build-chat    - Build Chat service"
	@echo "  make build-migrate - Build Migration service"
	@echo ""
	@echo "📦 Database Migrations:"
	@echo "  make migrate-up      - Apply all pending migrations"
	@echo "  make migrate-down    - Rollback migrations (interactive)"
	@echo "  make migrate-version - Show current migration versions"
	@echo "  make migrate-create  - Create new migration files (interactive)"
	@echo "  make migrate-run     - Run migrations via Docker"
	@echo ""
	@echo "🌱 Database Seeds:"
	@echo "  make seed            - Seed database with 100 test users"
	@echo "                         (Email: test1@gmail.com - test100@gmail.com)"
	@echo "                         (Password: 123456)"
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
	@echo "🌐 Web UI:"
	@echo "  make web-install - Install web dependencies (yarn)"
	@echo "  make web-dev     - Run web UI dev server (:3000)"
	@echo "  make run-web     - Alias for web-dev"
	@echo "  make web-build   - Build web UI for production"
	@echo "  make web-preview - Preview production build"
	@echo "  make web-clean   - Clean web artifacts"
	@echo "  make web-lint    - Lint web code"
	@echo ""
