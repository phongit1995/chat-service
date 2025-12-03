# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

No comments in code.

## Project Overview

A microservices-based chat server built with Go, featuring:
- **API Service** (port 8080): REST API + WebSocket + Kafka Producer
- **Chat Service** (port 8081): WebSocket-only service + Kafka Consumer
- **Migration Service**: Database schema management for PostgreSQL and ScyllaDB
- Real-time messaging via Socket.IO with Redis adapter for horizontal scaling
- Event-driven architecture using Kafka for inter-service communication
- Multi-database: PostgreSQL (metadata), ScyllaDB (messages), Redis (cache & WebSocket)

## Essential Commands

### Development Environment

```bash
# Start infrastructure (PostgreSQL, Redis, ScyllaDB, Kafka)
make dev-up

# Stop infrastructure
make dev-down

# Check service status
make dev-status

# View logs
make dev-logs

# Clean everything (including volumes)
make dev-clean

# Run services
make run-api          # API Service on :8080
make run-chat         # Chat Service on :8081

# Build
make build            # Build both services
make build-api        # Build API only
make build-chat       # Build Chat only

# Database migrations
make migrate-up       # Apply all pending migrations
make migrate-down     # Rollback migrations
make migrate-version  # Check current versions

# Tools
make swagger          # Generate Swagger docs (swag init)
make mod-tidy         # go mod tidy
```

### Running Services Locally

```bash
# Run API service (port 8080)
make run-api
# or: go run ./cmd/api

# Run Chat service (port 8081) - in separate terminal
make run-chat
# or: go run ./cmd/chat

# Build both services
make build

# Build individual services
make build-api      # Output: bin/api
make build-chat     # Output: bin/chat
make build-migrate  # Output: bin/migrate
```

### Database Operations

```bash
# Run migrations (up) for all databases
make migrate-up
# or: go run ./cmd/migrations up all

# Rollback migrations (interactive)
make migrate-down

# Check migration version
make migrate-version

# Create new migration (creates both PostgreSQL and ScyllaDB migrations)
make migrate-create
# Creates timestamped files in:
#   cmd/migrations/postgres/{timestamp}_{name}.{up|down}.sql
#   cmd/migrations/scylla/{timestamp}_{name}.{up|down}.cql

# Database shells
make db-shell      # PostgreSQL psql
make redis-cli     # Redis CLI
make scylla-cli    # ScyllaDB cqlsh
```

### Documentation & Dependencies

```bash
# Generate Swagger documentation
make swagger
# Requires: ~/go/bin/swag
# Output: docs/

# Tidy Go modules
make mod-tidy
```

### Kafka Operations

```bash
# Consume messages from Kafka topic
make kafka-cli
# Default topic: chat.message.created
```

## Architecture

### Microservices Structure

```
┌─────────────┐         ┌─────────────┐
│ API Service │         │Chat Service │
│   :8080     │         │   :8081     │
│             │         │             │
│ REST + WS   │◄───────►│ WS Only     │
│ + Kafka Pub │  Redis  │ + Kafka Sub │
└──────┬──────┘  Adapter└──────┬──────┘
       │                        │
       └────────┬───────────────┘
                ▼
          Kafka Cluster
```

**Service Responsibilities:**
- **API Service**: User authentication, profile, relationships, REST endpoints, WebSocket, Kafka producer
- **Chat Service**: WebSocket-only, Kafka consumer, minimal dependencies
- **Migration Service**: Run-once service for database schema setup

### Project Structure

```
cmd/
├── api/              # API Service entry point
│   ├── main.go
│   ├── config.go     # Service-specific validation
│   ├── container.go  # Dependency injection setup
│   └── server.go
├── chat/             # Chat Service entry point
│   ├── main.go
│   ├── config.go
│   └── container.go
└── migrations/       # Migration service
    ├── main.go
    ├── config.go
    ├── postgres_runner.go
    ├── scylla_runner.go
    ├── postgres/     # PostgreSQL .sql files
    └── scylla/       # ScyllaDB .cql files

internal/
├── config/           # Shared config loader
├── constants/        # Kafka topics, cache keys, events
│   └── constant.go   # SINGLE SOURCE OF TRUTH for constants
├── db/               # Database connections
│   ├── db.go         # PostgreSQL (GORM)
│   └── scylladb.go   # ScyllaDB (gocql)
├── logger/           # Zap logger setup
├── middleware/       # HTTP middlewares (auth, etc.)
├── models/           # GORM models
├── services/         # Business services
│   ├── jwt.service.go
│   ├── cache.service.go
│   ├── kafka_producer.go
│   └── kafka_consumer.go
├── utils/            # Utilities
│   ├── http.go       # Generic HTTP response types
│   └── cache_keys.go
└── modules/          # Feature modules (clean architecture)
    ├── auth/         # Authentication
    ├── user/         # User management
    ├── relationships/# Friend/block management
    ├── conversation/ # Conversations
    ├── message/      # Messages
    ├── websocket/    # WebSocket (shared by api & chat)
    │   ├── websocket.go
    │   ├── kafka_handlers.go
    │   ├── redis.go
    │   └── websocket.dig.go
    └── health/       # Health checks

Each module follows:
  {module}/
  ├── {module}.router.go     # HTTP routes
  ├── {module}.controller.go # HTTP handlers
  ├── {module}.service.go    # Business logic
  ├── {module}.repository.go # Data access
  ├── {module}.dto.go        # Request/response types
  └── {module}.dig.go        # DI providers
```

### Key Architectural Patterns

#### 1. Dependency Injection (Uber Dig)

Each service uses Uber Dig for dependency injection:

```go
// cmd/api/container.go
func NewContainer() (*dig.Container, error) {
    c := dig.New()

    // Core providers
    providers := []interface{}{
        provideConfig,
        logger.CreateLogger,
        db.NewPostgresDB,
        db.NewScyllaDB,
        services.NewCacheService,
        services.NewJWTService,
        services.NewKafkaProducer,
        // ...
    }

    // Module providers
    modules := []func(*dig.Container) error{
        auth.Provider,
        user.Provider,
        websocket.Provider,
        // ...
    }

    return c, nil
}
```

**Pattern**: Each module has a `{module}.dig.go` file with a `Provider` function.

#### 2. Service-Specific Config Validation

Each service validates ONLY what it needs:

```go
// API Service validates full stack
type APIConfigValidator struct {
    DBHost             string   `validate:"required"`
    RedisHost          string   `validate:"required"`
    WebSocketRedisHost string   `validate:"required"`
    ScyllaHost         string   `validate:"required"`
    JWTSecret          string   `validate:"required,min=32"`
    KafkaBrokers       []string `validate:"required,min=1"`
}

// Chat Service validates minimal requirements
type ChatConfigValidator struct {
    WebSocketRedisHost string   `validate:"required"`
    JWTSecret          string   `validate:"required,min=32"`
    KafkaBrokers       []string `validate:"required,min=1"`
}
```

**Pattern**: Validation happens in `cmd/{service}/config.go` using go-playground/validator.

#### 3. Constants-Based Configuration

**CRITICAL**: All Kafka topics, cache keys, WebSocket events, and application constants are defined in:
```
internal/constants/constant.go
```

**Always use constants, never hardcode strings:**
```go
// ✅ CORRECT
producer.Publish(constants.KafkaTopicMessageCreated, data)
cache.Set(fmt.Sprintf(constants.CacheKeyUserProfile, userID), data)
ws.Emit(constants.WebSocketEventNewMessage, msg)

// ❌ WRONG - Never do this
producer.Publish("CHAT.MESSAGE.CREATED", data)
cache.Set("USER:"+userID+":PROFILE", data)
ws.Emit("NEW_MESSAGE", msg)
```

**Adding New Constants:**
1. Add to appropriate section in `internal/constants/constant.go`
2. Use uppercase with underscores (e.g., `KAFKA_TOPIC_USER_STATUS`)
3. Group related constants together

#### 4. Event-Driven Communication

**Kafka Topics** (defined in `constants.go`):
- `CHAT.MESSAGE.CREATED`
- `CHAT.MESSAGE.DELETED`
- `CHAT.MESSAGE.UPDATED`
- `CHAT.CONVERSATION.CREATED`
- `CHAT.USER.ONLINE/OFFLINE`
- `CHAT.USER.TYPING`

**Flow:**
```
API Service → Kafka Producer → Topic → Kafka Consumer → Chat Service → WebSocket Broadcast
```

**Pattern**: API service publishes events, Chat service consumes and broadcasts via WebSocket.

#### 5. Distributed WebSocket

Both services use the same WebSocket module with Redis adapter:

```go
// internal/modules/websocket/websocket.go
func NewSocketIOServer(cfg *config.Config) *websocket.Server {
    io := socketio.NewServer(nil, nil)

    // Redis Adapter enables horizontal scaling
    adapter := redis_adapter.NewRedisAdapterWithDefault(
        fmt.Sprintf("redis://:%s@%s:%d/%d",
            cfg.WebSocketRedisPassword,
            cfg.WebSocketRedisHost,
            cfg.WebSocketRedisPort,
            cfg.WebSocketRedisDB,
        ),
    )
    io.Adapter(adapter)

    return &Server{IO: io}
}
```

**Key Point**: Multiple instances sync via Redis, enabling horizontal scaling.

#### 6. Clean Architecture Layers

```
Controller (HTTP/WebSocket handlers)
    ↓
Service (Business logic)
    ↓
Repository (Data access)
```

**Pattern**: Controllers should be thin, services contain business logic, repositories handle data operations.

#### 7. Generic HTTP Response

All REST endpoints use type-safe generic responses:

```go
// internal/utils/http.go
type Response[T any] struct {
    Success   bool      `json:"success"`
    Status    int       `json:"status"`
    TraceID   string    `json:"traceId"`
    Timestamp time.Time `json:"timestamp"`
    Path      string    `json:"path"`
    Data      *T        `json:"data,omitempty"`
    Error     string    `json:"error,omitempty"`
}

// Usage in controllers
utils.SuccessResponse(c, user)
utils.ErrorResponse(c, http.StatusBadRequest, "invalid input")
```

**Pattern**: Every response includes traceId for debugging across microservices.

## Database Migrations

### Migration System

**Custom migration service** supporting both PostgreSQL and ScyllaDB:
- Uses `golang-migrate/migrate` for PostgreSQL
- Custom executor for ScyllaDB (CQL)
- Dynamic keyspace replacement for ScyllaDB (`chat_keyspace` → actual keyspace)

### Migration Files

**Location:**
- PostgreSQL: `cmd/migrations/postgres/`
- ScyllaDB: `cmd/migrations/scylla/`

**Naming:** `{timestamp}_{name}.{up|down}.{sql|cql}`

Example:
```
20251202121919_init_schema.up.sql
20251202121919_init_schema.down.sql
20251202121923_create_tables.up.cql
20251202121923_create_tables.down.cql
```

### Running Migrations

**Local:**
```bash
# Apply all migrations
go run ./cmd/migrations up all

# Apply PostgreSQL only
go run ./cmd/migrations up postgres

# Apply ScyllaDB only
go run ./cmd/migrations up scylla

# Rollback (prompts for steps)
MIGRATION_STEPS=1 go run ./cmd/migrations down all
```

**Docker:**
```bash
docker-compose up migrate
```

**Environment Variables:**
- `MIGRATION_ACTION`: `up`, `down`, `version`
- `MIGRATE_DB`: `postgres`, `scylla`, `all` (default: `all`)
- `MIGRATION_STEPS`: Number of steps for rollback (default: 0)

### Creating New Migrations

```bash
make migrate-create
# Prompts for migration name
# Creates both PostgreSQL and ScyllaDB files with same timestamp
```

**Important**: Keep PostgreSQL and ScyllaDB migrations in sync where possible.

## Configuration

### Environment Files

- **API Service**: `.env`
- **Chat Service**: `.env.chat`
- **Migration Service**: Uses same env vars as API service

### Critical Config Values

**JWT Secret:**
- Must be at least 32 characters
- MUST be the same across API and Chat services
- Used for WebSocket authentication

**Redis WebSocket:**
- Both services MUST use the same Redis instance/DB for WebSocket adapter
- Enables distributed WebSocket sync

**Kafka Brokers:**
- Both services MUST connect to same Kafka cluster
- Consumer group: `CHAT-SERVICE-CONSUMERS` (from constants)

## Development Guidelines

### Adding New Features

1. **Define Constants First**: Add to `internal/constants/constant.go`
2. **Create Module**: Follow structure:
   ```
   internal/modules/myfeature/
   ├── myfeature.router.go
   ├── myfeature.controller.go
   ├── myfeature.service.go
   ├── myfeature.repository.go
   ├── myfeature.dto.go
   └── myfeature.dig.go
   ```
3. **Register in Container**: Add to `cmd/{service}/container.go`
4. **Add Tests**: Include unit tests for service layer

### Adding Kafka Events

1. Define topic in `internal/constants/constant.go`:
   ```go
   const KafkaTopicMyEvent = "CHAT.MY.EVENT"
   ```
2. Produce in API service:
   ```go
   producer.Publish(constants.KafkaTopicMyEvent, data)
   ```
3. Consume in Chat service:
   ```go
   consumer.Subscribe(constants.KafkaTopicMyEvent, handler)
   ```

### Adding WebSocket Events

1. Define event in `internal/constants/constant.go`:
   ```go
   const WebSocketEventMyEvent = "MY_EVENT"
   ```
2. Emit in handlers:
   ```go
   wsServer.IO.To(roomID).Emit(constants.WebSocketEventMyEvent, data)
   ```
3. Document in client-facing API docs

### Modifying Database Schema

1. Create migration: `make migrate-create`
2. Edit generated files in `cmd/migrations/postgres/` and `cmd/migrations/scylla/`
3. Test migrations: `make migrate-up`, verify, then `make migrate-down`
4. Update GORM models in `internal/models/` to match schema

### Code Comments

**Important**: This codebase follows a no-comments style:
- Remove decorative comments (banners, section headers)
- Remove obvious comments that explain what code does
- Keep only non-obvious comments explaining "why" not "what"
- Example:
  ```go
  // ❌ BAD
  // ============================================
  // User Service - Handles user operations
  // ============================================

  // ✅ GOOD (no comment, code is self-documenting)
  type UserService struct {
      repo UserRepository
  }
  ```

## Testing

### Health Checks

```bash
# API Service
curl http://localhost:8080/api/health

# Chat Service
curl http://localhost:8081/health
```

### Swagger Documentation

**URL:** `http://localhost:8080/swagger/index.html`

**Regenerate:**
```bash
make swagger
```

**Annotations**: Use Swaggo annotations in controllers:
```go
// @Summary User login
// @Description Authenticate user and return JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginDTO true "Login credentials"
// @Success 200 {object} Response[LoginResponse]
// @Router /auth/login [post]
func (c *Controller) Login(ctx *gin.Context) { ... }
```

## Docker

### Building Images

**Local build:**
```bash
docker build -t chat-server-api:latest --target api .
docker build -t chat-server-chat:latest --target chat .
docker build -t chat-server-migrate:latest -f Dockerfile.migrate .
```

**CI/CD:**
- GitHub Actions builds images on push to main or version tags
- Three images: `chat-service-api`, `chat-service-chat`, `chat-service-migrate`
- Security scanning with Trivy
- Workflow: `.github/workflows/docker-build.yml`

### Running with Docker Compose

```bash
# Full stack (all services + infrastructure)
docker-compose up -d

# Scale services
docker-compose up -d --scale api=3 --scale chat=3

# View logs
docker-compose logs -f api chat

# Stop all
docker-compose down

# Clean everything
docker-compose down -v
```

## Important Patterns & Conventions

### Error Handling

- Use structured errors with trace IDs
- Log errors with Zap logger
- Return user-friendly error messages via HTTP responses
- Pattern:
  ```go
  if err != nil {
      logger.Error("Failed to create user",
          zap.String("traceId", traceId),
          zap.Error(err))
      return utils.ErrorResponse(c, http.StatusInternalServerError,
          "failed to create user")
  }
  ```

### Trace IDs

- Every request gets a unique trace ID
- Propagate through: HTTP → Kafka → WebSocket
- Use for debugging across microservices
- Available in context: `ctx.GetString(constants.ContextKeyTraceID)`

### Cache Keys

- Use constants from `internal/constants/constant.go`
- Pattern: `{ENTITY}:{ID}:{DETAIL}`
- Example: `USER:uuid:PROFILE`, `CONVERSATION:uuid:MESSAGES`
- Set appropriate TTLs (also in constants)

### Consistent Naming

- Files: `{module}.{type}.go` (e.g., `user.service.go`)
- Types: PascalCase (e.g., `UserService`)
- Functions: PascalCase for exported, camelCase for private
- Constants: UPPER_SNAKE_CASE
- Database tables: snake_case
- JSON fields: camelCase

## Common Issues & Solutions

### Port Already in Use

```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>
```

### Migration Fails

```bash
# Check database connectivity
make db-shell

# Check migration version
make migrate-version

# Force version (if migration table is out of sync)
# For PostgreSQL:
psql -U postgres -d chat_server -c "SELECT * FROM schema_migrations;"

# For ScyllaDB:
cqlsh -e "SELECT * FROM chat_server.schema_migrations;"
```

### Kafka Connection Issues

```bash
# Check Kafka is running
docker-compose ps kafka

# Check topics
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Consume topic manually
docker-compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic CHAT.MESSAGE.CREATED \
  --from-beginning
```

### WebSocket Not Connecting

- Verify JWT token is valid and not expired
- Check Redis adapter connection (both services must use same Redis)
- Check CORS configuration in API service `.env`
- Verify client is sending token in `auth` object:
  ```javascript
  io('http://localhost:8080', {
    auth: { token: 'your-jwt-token' }
  })
  ```

## Service Ports

- API Service: `8080`
- Chat Service: `8081`
- PostgreSQL: `5432`
- Redis (cache): `6379`
- Redis (WebSocket): `6380` (if separate instance)
- ScyllaDB: `9042`
- Kafka: `9092`

## Critical Dependencies

- **Go**: 1.24.5
- **Gin**: HTTP framework
- **GORM**: PostgreSQL ORM
- **gocql**: ScyllaDB driver
- **Socket.IO**: `github.com/zishang520/socket.io/servers/socket/v3`
- **Redis Adapter**: `github.com/zishang520/socket.io/adapters/redis/v3`
- **Kafka**: `github.com/segmentio/kafka-go`
- **Uber Dig**: Dependency injection
- **Uber Zap**: Logging
- **golang-migrate**: Database migrations

## Additional Resources

- **Swagger UI**: `http://localhost:8080/swagger/index.html`
- **Makefile**: Run `make help` for all available commands
- **README.md**: Detailed feature documentation