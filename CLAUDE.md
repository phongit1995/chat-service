# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run Commands

```bash
# Start infrastructure (PostgreSQL, Redis, ScyllaDB, Kafka)
make dev-up

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

## Architecture Overview

### Microservices
- **API Service** (`:8080`): REST API + WebSocket + Kafka Producer
- **Chat Service** (`:8081`): WebSocket + Kafka Consumer

### Data Flow
```
Client → API Service → Kafka → Chat Service → ScyllaDB
                ↓              ↓
           PostgreSQL    WebSocket broadcast (via Redis Adapter)
```

### Database Strategy
- **PostgreSQL**: Users, relationships, conversations metadata
- **ScyllaDB**: Messages (high-write workload, time-series queries)
- **Redis**: Cache + WebSocket adapter for distributed pub/sub

### Dependency Injection
Uses Uber's `dig` container. Each module provides a `Provider(c *dig.Container) error` function that registers its services:

```
cmd/api/container.go → registers core services
internal/modules/*/dig.go → each module registers its own providers
```

### Module Structure
Each module in `internal/modules/` follows:
- `*.model.go` - Data structures
- `*.repository.go` - Database operations
- `*.service.go` - Business logic
- `*.controller.go` - HTTP handlers
- `*.cache.go` - Redis cache operations
- `*.dig.go` - DI provider registration

### WebSocket
Socket.IO v3 with Redis Adapter for horizontal scaling. Both API and Chat services share events via Redis pub/sub.

### Kafka Topics
Defined in `internal/constants/kafka_topics.go`. Consumer groups in `internal/constants/kafka_consumer_groups.go`.

## Code Generation Rules

### No Comments Policy
- DO NOT generate comments in code
- DO NOT add inline comments, block comments, or documentation comments
- Code should be self-documenting through clear naming

### Code Style
- Follow Go naming conventions (camelCase for private, PascalCase for public)
- Keep functions small and focused
- Use descriptive variable and function names
