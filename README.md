# Chat Server - Microservices Architecture

A scalable, real-time chat server built with Go microservices, featuring Kafka message streaming, Socket.IO WebSocket support, JWT authentication, and clean architecture principles.

## 🚀 Features

- **Microservices Architecture**: Separate API and Chat services for scalability
- **Real-time Communication**: Socket.IO v3 with Redis Adapter for distributed WebSocket
- **Event Streaming**: Kafka for asynchronous message processing between services
- **RESTful API**: Well-structured REST endpoints with Swagger documentation
- **JWT Authentication**: Secure token-based authentication system
- **Clean Architecture**: Modular design with clear separation of concerns
- **Dependency Injection**: Using Uber's Dig for clean dependency management
- **Type-Safe HTTP Handlers**: Generic response types with compile-time safety
- **Comprehensive Logging**: Structured logging with Zap
- **Multi-Database**: PostgreSQL (relational), ScyllaDB (messages), Redis (cache & WebSocket)
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Docker Support**: Full containerization with Docker Compose
- **Request Tracing**: X-Trace-Id for distributed tracing

## 📋 Tech Stack

### Core Technologies
- **Language**: Go 1.24.5
- **Web Framework**: Gin (high-performance HTTP framework)
- **WebSocket**: Socket.IO v3 (`github.com/zishang520/socket.io`)
- **Message Broker**: Apache Kafka (Confluent Platform 7.5.0)
- **Databases**:
  - PostgreSQL (users, relationships, conversations)
  - ScyllaDB (message storage)
  - Redis (cache & WebSocket adapter)

### Key Libraries
- **Authentication**: JWT (golang-jwt/jwt)
- **Logging**: Uber Zap (structured logging)
- **Dependency Injection**: Uber Dig
- **API Documentation**: Swaggo
- **Password Hashing**: bcrypt (golang.org/x/crypto)
- **Configuration**: godotenv + caarlos0/env
- **Validation**: go-playground/validator/v10
- **Kafka Client**: Confluent Kafka Go
- **Socket.IO**: zishang520/socket.io v3
- **Redis Adapter**: zishang520/redis-adapter v3

## 🏗️ Architecture

### Microservices Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                               │
│                (Browser/Mobile App)                         │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             │ HTTP REST                      │ WebSocket
             │                                │
       ┌─────▼──────────┐              ┌─────▼──────────┐
       │  API Service   │              │  Chat Service  │
       │   :8080        │              │    :8081       │
       │                │              │                │
       │ • REST API     │              │ • WebSocket    │
       │ • WebSocket    │◄─────────────┤ • Kafka        │
       │ • Kafka        │   Redis      │   Consumer     │
       │   Producer     │   Adapter    │                │
       └────┬───────────┘              └────┬───────────┘
            │                               │
            │ Events                        │ Messages
            │                               │
       ┌────▼───────────────────────────────▼────┐
       │           Kafka Cluster                 │
       │     (Message Streaming Platform)        │
       └─────────────────────────────────────────┘
            │                               │
       ┌────▼──────────┐              ┌────▼──────────┐
       │  PostgreSQL   │              │   ScyllaDB    │
       │  (Metadata)   │              │  (Messages)   │
       └───────────────┘              └───────────────┘
```

### Service Responsibilities

#### API Service (`:8080`)
- **REST API**: User authentication, profile management, relationships
- **WebSocket**: Real-time chat (optional - clients can connect here or to Chat service)
- **Kafka Producer**: Publishes message events to Kafka
- **Database**: PostgreSQL (users, relationships, conversations)

#### Chat Service (`:8081`)
- **WebSocket Only**: Dedicated real-time chat service
- **Kafka Consumer**: Processes message events from Kafka
- **Message Storage**: Saves messages to ScyllaDB
- **No Database Dependencies**: Minimal service for chat only

### Project Structure

```
chat-server/
├── cmd/
│   ├── api/                       # API Service (REST + WebSocket + Kafka Producer)
│   │   ├── main.go               # Entry point
│   │   ├── config.go             # Service-specific config & validation
│   │   ├── container.go          # DI container setup
│   │   └── server.go             # HTTP server configuration
│   └── chat/                      # Chat Service (WebSocket + Kafka Consumer)
│       ├── main.go               # Entry point
│       ├── config.go             # Service-specific config & validation
│       └── container.go          # DI container setup
├── internal/
│   ├── config/                   # Shared configuration
│   │   └── config.go
│   ├── db/                       # Database connections
│   │   ├── postgres.go           # PostgreSQL connection
│   │   └── scylla.go             # ScyllaDB connection
│   ├── logger/                   # Logging setup
│   │   └── logger.go
│   ├── middleware/               # HTTP middlewares
│   │   └── auth.middleware.go
│   ├── models/                   # Database models
│   │   ├── user.model.go
│   │   ├── conversation.model.go
│   │   ├── message.model.go
│   │   └── relationship.model.go
│   ├── services/                 # Business services
│   │   ├── jwt.service.go
│   │   ├── cache.service.go
│   │   ├── kafka_producer.go
│   │   └── kafka_consumer.go
│   ├── utils/                    # Utility functions
│   │   └── http.go              # HTTP helpers & response types
│   └── modules/                  # Feature modules
│       ├── auth/                # Authentication
│       ├── user/                # User management
│       ├── relationships/       # Friend/block management
│       ├── conversation/        # Conversation management
│       ├── message/             # Message management
│       ├── websocket/           # Shared WebSocket module
│       │   ├── server.go        # Socket.IO server setup
│       │   ├── handlers.go      # WebSocket event handlers
│       │   ├── kafka_handlers.go # Kafka message handlers
│       │   └── dig.go           # DI providers
│       └── health/              # Health checks
├── .env                          # API Service environment
├── .env.chat                     # Chat Service environment
├── docker-compose.yml            # Full stack orchestration
├── docker-compose.dev.yml        # Development infrastructure
├── Dockerfile                    # Multi-stage build
├── Makefile                      # Build & dev commands
└── README.md
```

### Architectural Patterns

#### 1. **Microservices Communication**

**Synchronous (REST)**:
- Client → API Service: User operations, profile, relationships

**Asynchronous (Kafka)**:
- API Service → Kafka → Chat Service: Message events
- Enables loose coupling and service independence

**Real-time (WebSocket + Redis Adapter)**:
- Client can connect to either API or Chat service
- Redis Adapter syncs events across all WebSocket instances
- Horizontal scaling support

#### 2. **Event-Driven Architecture**

```go
// API Service publishes message event
producer.Publish(kafka.Message{
    Topic: "chat.messages",
    Event: "message.sent",
    Data: messageData,
})

// Chat Service consumes and processes
consumer.Subscribe("chat.messages", func(msg kafka.Message) {
    // Save to ScyllaDB
    // Broadcast via WebSocket
    wsServer.Emit("message.received", msg.Data)
})
```

#### 3. **Service-Specific Configuration**

Each service has its own config struct with validation:

```go
// API Service - Full validation
type APIConfigValidator struct {
    DBHost              string   `validate:"required"`
    RedisHost           string   `validate:"required"`
    WebSocketRedisHost  string   `validate:"required"`
    ScyllaHost          string   `validate:"required"`
    JWTSecret           string   `validate:"required,min=32"`
    CORSAllowedOrigins  []string `validate:"required,min=1"`
}

// Chat Service - Minimal validation
type ChatConfigValidator struct {
    WebSocketRedisHost string `validate:"required"`
    JWTSecret          string `validate:"required,min=32"`
}
```

#### 4. **Shared WebSocket Module**

Both services use the same WebSocket module:

```go
// internal/modules/websocket/server.go
func NewSocketIOServer(cfg *config.Config) (*Server, error) {
    // Create Socket.IO server
    io := socketio.NewServer(nil, nil)

    // Redis Adapter for distributed WebSocket
    adapter := redis_adapter.NewRedisAdapterWithDefault(
        redisClient.String(),
    )
    io.Adapter(adapter)

    return &Server{IO: io}, nil
}
```

#### 5. **Clean Architecture Layers**

```
┌─────────────────────────────────────┐
│         Controller Layer            │  HTTP handlers, WebSocket events
├─────────────────────────────────────┤
│          Service Layer              │  Business logic
├─────────────────────────────────────┤
│        Repository Layer             │  Data access
└─────────────────────────────────────┘
```

## 🛠️ Getting Started

### Prerequisites

- Go 1.24.5 or higher
- Docker & Docker Compose
- Make (optional, for convenience commands)

### Quick Start with Docker

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/chat-server.git
cd chat-server
```

2. **Set up environment files**
```bash
cp .env.example .env
cp .env.example .env.chat
```

3. **Start all services**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379) - Cache
- Redis (port 6380) - WebSocket Adapter
- ScyllaDB (port 9042)
- Kafka + KRaft (port 9092)
- API Service (port 8080)
- Chat Service (port 8081)

4. **Check service status**
```bash
docker-compose ps
```

### Development Setup (Local)

1. **Start infrastructure only**
```bash
make dev-up
```

2. **Run API Service**
```bash
make run-api
# Or manually:
go run ./cmd/api/main.go
```

3. **Run Chat Service (in another terminal)**
```bash
make run-chat
# Or manually:
go run ./cmd/chat/main.go
```

### Service Endpoints

- **API Service**: `http://localhost:8080`
  - REST API: `http://localhost:8080/api/*`
  - WebSocket: `ws://localhost:8080/socket.io/`
  - Swagger: `http://localhost:8080/swagger/index.html`

- **Chat Service**: `http://localhost:8081`
  - WebSocket: `ws://localhost:8081/socket.io/`

## 🔧 Configuration

### API Service (`.env`)

```env
# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
GIN_MODE=debug

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_server_dev
DB_USER=postgres
DB_PASSWORD=postgres123

# Redis (Cache)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123
REDIS_DB=0

# Redis (WebSocket Adapter)
WEBSOCKET_REDIS_HOST=localhost
WEBSOCKET_REDIS_PORT=6380
WEBSOCKET_REDIS_PASSWORD=redis123
WEBSOCKET_REDIS_DB=1

# ScyllaDB
SCYLLA_HOST=localhost
SCYLLA_PORT=9042
SCYLLA_KEYSPACE=chat_server
SCYLLA_CONSISTENCY=LOCAL_QUORUM

# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_GROUP_ID=chat-api-service
KAFKA_AUTO_OFFSET_RESET=latest

# JWT
JWT_SECRET=your-secret-key-min-32-chars-here
JWT_EXPIRY=24h

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Chat Service (`.env.chat`)

```env
# Server Configuration
GIN_MODE=debug
CHAT_PORT=8081

# Redis (WebSocket Adapter) - Required
WEBSOCKET_REDIS_HOST=localhost
WEBSOCKET_REDIS_PORT=6380
WEBSOCKET_REDIS_PASSWORD=redis123
WEBSOCKET_REDIS_DB=1

# Kafka - Required
KAFKA_BROKER=localhost:9092
KAFKA_GROUP_ID=chat-service
KAFKA_AUTO_OFFSET_RESET=latest

# JWT - Required for authentication
JWT_SECRET=your-secret-key-min-32-chars-here
```

## 📚 API Documentation

### Interactive Swagger UI

```
http://localhost:8080/swagger/index.html
```

### REST API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

#### User Management
- `GET /api/user/profile` - Get user profile (protected)
- `PUT /api/user/profile` - Update user profile (protected)

#### Relationships
- `POST /api/relationships/friend-request` - Send friend request
- `POST /api/relationships/accept-friend` - Accept friend request
- `POST /api/relationships/block` - Block user
- `GET /api/relationships/friends` - Get friends list
- `GET /api/relationships/blocked` - Get blocked users

#### Conversations
- `GET /api/conversations` - Get user's conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id/messages` - Get conversation messages

#### Messages
- `POST /api/messages` - Send message (publishes to Kafka)
- `GET /api/messages/:id` - Get specific message
- `PUT /api/messages/:id/read` - Mark message as read

#### Health Check
- `GET /api/health` - System health status

### WebSocket Events

#### Client → Server

```javascript
// Connect with JWT token
const socket = io('http://localhost:8080', {
  auth: { token: 'your-jwt-token' }
});

// Join conversation
socket.emit('conversation.join', { conversationId: 'uuid' });

// Send message
socket.emit('message.send', {
  conversationId: 'uuid',
  content: 'Hello!',
  type: 'text'
});

// Typing indicator
socket.emit('typing.start', { conversationId: 'uuid' });
socket.emit('typing.stop', { conversationId: 'uuid' });
```

#### Server → Client

```javascript
// Message received
socket.on('message.received', (data) => {
  console.log('New message:', data);
});

// User typing
socket.on('typing.user', (data) => {
  console.log(`${data.username} is typing...`);
});

// Message read
socket.on('message.read', (data) => {
  console.log('Message marked as read:', data);
});
```

### Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "status": 200,
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-11-30T10:00:00Z",
  "path": "/api/user/profile",
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "status": 401,
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-11-30T10:00:00Z",
  "path": "/api/user/profile",
  "error": "invalid or expired token"
}
```

## 🧪 Development

### Available Make Commands

```bash
make help              # Show all available commands

# Development - Run Services
make run-api          # Run API service
make run-chat         # Run Chat service
make build            # Build both services
make swagger          # Generate Swagger docs

# Docker Development Environment
make dev-up           # Start all infrastructure (PostgreSQL, Redis, Scylla, Kafka)
make dev-down         # Stop all services
make dev-logs         # View logs
make dev-clean        # Clean up everything
make dev-status       # Check service status

# Database Operations
make db-shell         # Connect to PostgreSQL
make redis-cli        # Connect to Redis
make scylla-shell     # Connect to ScyllaDB

# Kafka Operations
make kafka-topics     # List Kafka topics
make kafka-consume    # Consume messages from topic

# Go Modules
make mod-tidy         # Tidy dependencies
make mod-download     # Download dependencies
```

### Database Schema

#### PostgreSQL Tables

- `users` - User accounts
- `relationships` - Friend requests, friendships, blocks
- `conversations` - Chat conversations metadata
- `conversation_participants` - Users in conversations

#### ScyllaDB Tables

```cql
CREATE TABLE messages (
    conversation_id uuid,
    message_id uuid,
    sender_id uuid,
    content text,
    message_type text,
    created_at timestamp,
    is_read boolean,
    PRIMARY KEY (conversation_id, created_at, message_id)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

### Kafka Topics

- `chat.messages` - Message events
  - `message.sent` - New message created
  - `message.read` - Message marked as read
  - `message.deleted` - Message deleted

## 🎯 Key Features Deep Dive

### 1. Distributed WebSocket with Redis Adapter

```go
// Multiple WebSocket instances sync via Redis
// Client A connects to API Service (8080)
// Client B connects to Chat Service (8081)
// Both can communicate in real-time

adapter := redis_adapter.NewRedisAdapterWithDefault("redis://localhost:6380")
io.Adapter(adapter)
```

### 2. Kafka Event Streaming

```go
// API Service: Publish message event
err := producer.Publish(ctx, kafka.Message{
    Topic: "chat.messages",
    Key:   conversationID,
    Value: messageJSON,
})

// Chat Service: Consume and process
consumer.Subscribe("chat.messages", func(msg *kafka.Message) {
    // Save to ScyllaDB
    scylla.SaveMessage(message)

    // Broadcast via WebSocket
    wsServer.To(conversationID).Emit("message.received", message)
})
```

### 3. Service-Specific Validation

```go
// Validates at startup - fail fast
func (c *APIServiceConfig) Validate() error {
    validator := validator.New()
    return validator.Struct(&APIConfigValidator{
        DBHost:     c.DBHost,
        RedisHost:  c.RedisHost,
        // ... other required fields
    })
}
```

### 4. Request Tracing

Every request gets a unique trace ID:
```
X-Trace-Id: 550e8400-e29b-41d4-a716-446655440000
```

Track requests across microservices for debugging.

## 📊 Monitoring & Health Checks

### API Service Health

```bash
curl http://localhost:8080/api/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "postgres": "connected",
    "redis": "connected",
    "scylla": "connected",
    "kafka": "connected"
  }
}
```

### Chat Service Health

```bash
curl http://localhost:8081/health
```

## 🚢 Production Deployment

### Build Production Binaries

```bash
# API Service
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/api ./cmd/api

# Chat Service
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/chat ./cmd/chat
```

### Docker Production Build

```bash
# Build images
docker build -t chat-server-api:latest --target api .
docker build -t chat-server-chat:latest --target chat .

# Run containers
docker run -p 8080:8080 --env-file .env chat-server-api:latest
docker run -p 8081:8081 --env-file .env.chat chat-server-chat:latest
```

### Scaling Strategy

**Horizontal Scaling:**
- Run multiple instances of each service
- Redis Adapter syncs WebSocket events
- Kafka consumer groups distribute load
- Load balancer in front of services

**Example with Docker Compose:**
```bash
docker-compose up -d --scale api=3 --scale chat=3
```

## 🛡️ Security Best Practices

- ✅ JWT tokens with expiration
- ✅ Password hashing with bcrypt
- ✅ SQL injection protection (GORM)
- ✅ CORS configuration
- ✅ Request validation
- ✅ Service-specific config validation
- ✅ Secure headers
- ✅ Environment-based secrets
- ✅ WebSocket authentication via JWT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow Go best practices
- Use `gofmt` for formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Gin](https://github.com/gin-gonic/gin) - HTTP web framework
- [GORM](https://gorm.io/) - ORM library
- [Uber Zap](https://github.com/uber-go/zap) - Logging library
- [Uber Dig](https://github.com/uber-go/dig) - Dependency injection
- [Socket.IO Go](https://github.com/zishang520/socket.io) - WebSocket library
- [Confluent Kafka Go](https://github.com/confluentinc/confluent-kafka-go) - Kafka client
- [Swaggo](https://github.com/swaggo/swag) - Swagger generation

---

**Made with ❤️ and Go**
