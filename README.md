# Chat Server

A scalable, real-time chat server built with Go, featuring WebSocket support, JWT authentication, and clean architecture principles.

## 🚀 Features

- **Real-time Communication**: WebSocket support for instant messaging
- **RESTful API**: Well-structured REST endpoints with Swagger documentation
- **JWT Authentication**: Secure token-based authentication system
- **Clean Architecture**: Modular design with clear separation of concerns
- **Dependency Injection**: Using Uber's Dig for clean dependency management
- **Type-Safe HTTP Handlers**: Generic response types with compile-time safety
- **Comprehensive Logging**: Structured logging with Zap
- **Database Migrations**: GORM-based migrations with PostgreSQL
- **Caching Layer**: Redis integration for session management
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Docker Support**: Full containerization with Docker Compose
- **Request Tracing**: X-Trace-Id for distributed tracing

## 📋 Tech Stack

### Core Technologies
- **Language**: Go 1.24.5
- **Web Framework**: Gin (high-performance HTTP framework)
- **Database**: PostgreSQL (primary data store)
- **Cache**: Redis (session & caching)
- **ORM**: GORM (database operations)

### Key Libraries
- **Authentication**: JWT (golang-jwt/jwt)
- **Logging**: Uber Zap (structured logging)
- **Dependency Injection**: Uber Dig
- **API Documentation**: Swaggo
- **Password Hashing**: bcrypt (golang.org/x/crypto)
- **Configuration**: godotenv + caarlos0/env
- **Validation**: go-playground/validator

## 🏗️ Architecture

### Project Structure

```
chat-server/
├── cmd/
│   ├── api/                    # REST API server
│   │   ├── main.go            # Application entry point
│   │   ├── container.go       # DI container setup
│   │   └── server.go          # Server configuration
│   └── websocket/             # WebSocket server
│       └── main.go
├── internal/
│   ├── config/                # Configuration management
│   │   └── config.go
│   ├── db/                    # Database connection
│   │   └── db.go
│   ├── logger/                # Logging setup
│   │   └── logger.go
│   ├── middleware/            # HTTP middlewares
│   │   └── auth.middleware.go
│   ├── models/                # Database models
│   │   └── user.model.go
│   ├── services/              # Business services
│   │   └── jwt.service.go
│   ├── utils/                 # Utility functions
│   │   └── http.go           # HTTP helpers & response types
│   └── modules/               # Feature modules
│       ├── auth/             # Authentication module
│       │   ├── auth.controller.go
│       │   ├── auth.service.go
│       │   ├── auth.repository.go
│       │   ├── auth.router.go
│       │   ├── auth.dto.go
│       │   └── auth.dig.go
│       ├── user/             # User management module
│       │   ├── user.controller.go
│       │   ├── user.service.go
│       │   ├── user.repository.go
│       │   ├── user.router.go
│       │   ├── user.dto.go
│       │   └── user.dig.go
│       └── health/           # Health check module
│           ├── health.controller.go
│           ├── health.service.go
│           ├── health.router.go
│           ├── health.dto.go
│           └── health.dig.go
├── docs/                      # Swagger documentation
├── bin/                       # Compiled binaries
├── docker-compose.yml         # Docker orchestration
├── Makefile                  # Build & dev commands
├── go.mod                    # Go modules
└── README.md
```

### Architectural Patterns

#### 1. **Clean Architecture Layers**
```
┌─────────────────────────────────────┐
│         Controller Layer            │  (HTTP handlers, request validation)
├─────────────────────────────────────┤
│          Service Layer              │  (Business logic)
├─────────────────────────────────────┤
│        Repository Layer             │  (Data access)
└─────────────────────────────────────┘
```

#### 2. **Module Structure**
Each feature module follows consistent structure:
- **Controller**: HTTP request handling
- **Service**: Business logic implementation
- **Repository**: Database operations
- **Router**: Route definitions
- **DTO**: Data Transfer Objects
- **DIG**: Dependency injection providers

#### 3. **Generic Response System**
Type-safe HTTP responses using Go generics:

```go
// Base generic response type
type BaseResponse[T any] struct {
    Success   bool   `json:"success"`
    Status    int    `json:"status"`
    TraceID   string `json:"traceId"`
    Timestamp string `json:"timestamp"`
    Path      string `json:"path"`
    Data      T      `json:"data,omitempty"`
    Error     string `json:"error,omitempty"`
}

// Module-specific aliases
type AuthSuccessResponse = utils.BaseResponse[AuthResponse]
type UserProfileSuccessResponse = utils.BaseResponse[UserProfileResponse]
```

**Benefits:**
- ✅ DRY principle - define structure once
- ✅ Type safety at compile time
- ✅ Automatic Swagger documentation
- ✅ Consistent API responses

#### 4. **Custom HTTP Handler Pattern**

```go
// Custom handler signature for clean error handling
type AppHandler func(c *gin.Context) (interface{}, error)

// Automatic response wrapping with trace ID
func wrap(h AppHandler) gin.HandlerFunc {
    return func(c *gin.Context) {
        result, err := h(c)
        if err != nil {
            // Auto error response with trace ID
            c.JSON(status, ApiResponse{...})
            return
        }
        // Auto success response
        c.JSON(http.StatusOK, ApiResponse{...})
    }
}
```

#### 5. **Flexible Middleware Integration**

```go
// Middleware can be applied at group or route level
api := utils.NewAppGroup(r.Group("/api"))

// Group-level middleware
protected := api.Group("/protected", authMiddleware.RequireAuth())
protected.GET("/profile", controller.GetProfile)

// Route-level middleware
api.POST("/upload",
    authMiddleware.RequireAuth(),
    rateLimitMiddleware(),
    uploadController.Upload,
)
```

## 🛠️ Getting Started

### Prerequisites

- Go 1.24.5 or higher
- PostgreSQL 14+
- Redis 7+
- Docker & Docker Compose (optional)
- Make (optional, for convenience commands)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/chat-server.git
cd chat-server
```

2. **Install dependencies**
```bash
go mod download
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start infrastructure (PostgreSQL & Redis)**
```bash
make dev-up
```

5. **Run the server**
```bash
make run
```

The server will start on `http://localhost:8080`

### Using Docker

**Start everything with Docker Compose:**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- API server

## 🔧 Configuration

Configuration is managed through environment variables:

```env
# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
GIN_MODE=debug

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_server_dev
DB_USER=postgres
DB_PASSWORD=postgres123
DB_SSL_MODE=disable

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=24h

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000

# WebSocket Configuration
WS_READ_BUFFER_SIZE=1024
WS_WRITE_BUFFER_SIZE=1024
```

## 📚 API Documentation

### Interactive Swagger UI

Access the Swagger documentation at:
```
http://localhost:8080/swagger/index.html
```

### Generate/Update Swagger Docs

```bash
make swagger
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

#### User Management
- `GET /api/user/profile` - Get user profile (protected)
- `PUT /api/user/profile` - Update user profile (protected)

#### Health Check
- `GET /api/health` - System health status

### Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "status": 200,
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-11-29T10:00:00Z",
  "path": "/api/user/profile",
  "data": {
    "id": 1,
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
  "timestamp": "2025-11-29T10:00:00Z",
  "path": "/api/user/profile",
  "error": "invalid or expired token"
}
```

## 🧪 Development

### Available Make Commands

```bash
make help              # Show all available commands

# Development
make run              # Run server (auto-kill port 8080)
make build            # Build binary to ./bin/api
make swagger          # Generate Swagger docs

# Docker Development Environment
make dev-up           # Start PostgreSQL & Redis
make dev-down         # Stop services
make dev-logs         # View logs
make dev-clean        # Clean up everything
make dev-status       # Check service status
make db-shell         # Connect to PostgreSQL
make redis-cli        # Connect to Redis

# Go Modules
make mod-tidy         # Tidy dependencies
make mod-download     # Download dependencies
```

### Database Operations

**Connect to PostgreSQL:**
```bash
make db-shell
```

**View database logs:**
```bash
make db-logs
```

### Redis Operations

**Connect to Redis CLI:**
```bash
make redis-cli
```

**View Redis logs:**
```bash
make redis-logs
```

## 🔐 Authentication Flow

1. **User Registration**
   ```bash
   curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "john_doe",
       "email": "john@example.com",
       "password": "password123"
     }'
   ```

2. **User Login**
   ```bash
   curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "john@example.com",
       "password": "password123"
     }'
   ```

3. **Access Protected Route**
   ```bash
   curl -X GET http://localhost:8080/api/user/profile \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## 🎯 Key Features Deep Dive

### 1. Request Tracing

Every request gets a unique trace ID for debugging:
```
X-Trace-Id: 550e8400-e29b-41d4-a716-446655440000
```

Track requests across logs and responses for debugging.

### 2. Structured Logging

All logs are structured using Uber Zap:
```go
logger.Infow("User login attempt",
    "email", req.Email,
    "ip", c.ClientIP(),
    "traceId", traceID,
)
```

### 3. Dependency Injection

Clean DI using Uber Dig:
```go
// Provide dependencies
container.Provide(db.NewDatabase)
container.Provide(logger.NewLogger)
container.Provide(services.NewJWTService)

// Auto-resolve dependencies
container.Invoke(CreateServer)
```

### 4. Middleware Chain

Flexible middleware system:
```go
// Global middleware
router.Use(gin.Logger(), gin.Recovery())

// Group middleware
api.Use(corsMiddleware())

// Route middleware
api.POST("/upload",
    authMiddleware.RequireAuth(),
    rateLimitMiddleware(),
    uploadHandler,
)
```

## 📊 Monitoring & Observability

### Health Check

Check system health:
```bash
curl http://localhost:8080/api/health
```

Response includes:
- Database connection status
- Redis connection status
- System version
- Service uptime

### Logs

Structured JSON logs with:
- Request tracing
- User context
- Error details
- Performance metrics

## 🚢 Production Deployment

### Build Production Binary

```bash
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/api ./cmd/api
```

### Docker Production Build

```bash
docker build -t chat-server:latest .
docker run -p 8080:8080 \
  --env-file .env.production \
  chat-server:latest
```

### Environment Setup

1. Set `GIN_MODE=release`
2. Use strong JWT secrets (min 32 chars)
3. Enable SSL for database connections
4. Configure proper CORS origins
5. Set up log aggregation
6. Configure health check monitoring

## 🛡️ Security Best Practices

- ✅ JWT tokens with expiration
- ✅ Password hashing with bcrypt
- ✅ SQL injection protection (GORM)
- ✅ CORS configuration
- ✅ Request validation
- ✅ Rate limiting ready
- ✅ Secure headers
- ✅ Environment-based secrets

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

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Gin](https://github.com/gin-gonic/gin) - HTTP web framework
- [GORM](https://gorm.io/) - ORM library
- [Uber Zap](https://github.com/uber-go/zap) - Logging library
- [Uber Dig](https://github.com/uber-go/dig) - Dependency injection
- [Swaggo](https://github.com/swaggo/swag) - Swagger generation

## 📧 Contact

Your Name - [@yourhandle](https://twitter.com/yourhandle)

Project Link: [https://github.com/yourusername/chat-server](https://github.com/yourusername/chat-server)

---

**Made with ❤️ and Go**
