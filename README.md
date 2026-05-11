# Chat Server — Microservices Chat Platform

A real-time chat platform built in Go with a microservices architecture, using Kafka for event streaming, Socket.IO + Redis Adapter for distributed WebSocket, multi-database storage (PostgreSQL + ScyllaDB + Redis), and clean architecture.

## Key Features

- Microservices: separate **API Service** (REST + WebSocket + Kafka Producer) and **Chat Service** (WebSocket + Kafka Consumer)
- Real-time messaging with Socket.IO v3 + Redis Adapter — supports horizontal scaling
- Event streaming via Kafka (KRaft mode) for inter-service communication
- Idempotent message send with client-minted `clientMsgId` + optimistic UI
- Async per-member fanout on send; typing routed via user rooms
- Multi-database:
  - **PostgreSQL** — users, auth metadata, refresh tokens, relationships
  - **ScyllaDB** — conversations, members, messages, per-user inboxes, read/hidden state
  - **Redis** — cache + WebSocket adapter + presence + typing rate limits
- JWT authentication (shared secret across both services)
- Dedicated migration service for both PostgreSQL and ScyllaDB
- Auto-generated Swagger / OpenAPI docs
- Web client (React + Vite) and mobile client (Flutter) under `clients/`
- Observability: Loki + Grafana + Alloy
- Distributed tracing via `X-Trace-Id`

## Tech Stack

- **Language:** Go 1.24.5
- **HTTP framework:** Gin
- **WebSocket:** `zishang520/socket.io/servers/socket/v3` + `adapters/redis/v3`
- **Message broker:** Apache Kafka (Confluent 7.5.0, KRaft) — client `segmentio/kafka-go`
- **RDBMS:** PostgreSQL 15 + GORM + pgx
- **NoSQL:** ScyllaDB 5.4 + `gocql`
- **Cache:** Redis 7 (`go-redis/v9`)
- **Auth:** `golang-jwt/jwt/v5` + bcrypt
- **Migrations:** `golang-migrate/migrate/v4` (PG) + custom CQL runner (Scylla)
- **DI:** Uber Dig
- **Logging:** Uber Zap
- **Validation:** `go-playground/validator/v10`
- **Config:** `caarlos0/env` + `joho/godotenv`
- **Docs:** Swaggo
- **Observability:** Loki + Grafana + Alloy

## Architecture

```text
            ┌────────────────────────┐
            │    Client (Web/App)    │
            └───────┬────────────────┘
       HTTP/REST    │     WebSocket
                    │
       ┌────────────┴────────────┐
       │                         │
┌──────▼──────┐           ┌──────▼──────┐
│ API Service │           │ Chat Service│
│   :8080     │           │             │
│             │           │             │
│ REST + WS   │◄── Redis ►│  WS only    │
│ Kafka Prod. │  Adapter  │ Kafka Cons. │
└──────┬──────┘           └──────┬──────┘
       │                         │
       └────────────┬────────────┘
                    ▼
              Kafka Cluster
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
  PostgreSQL    ScyllaDB          Redis
  (users +      (chat data +      (cache +
 relations)      inboxes)        WS/presence)
```

### Service Responsibilities

- **API Service (`:8080`)** — Auth, user, relationships, conversations, and message APIs; WebSocket; produces Kafka events.
- **Chat Service (`:8081`)** — WebSocket only; consumes Kafka events and broadcasts to user rooms.
- **Migration Service** — Run-once: applies migrations for both PostgreSQL and ScyllaDB.

### Project Structure

```text
chat-server/
├── cmd/
│   ├── api/             # API service entry (main, config, container, server)
│   ├── chat/            # Chat service entry
│   └── migrations/      # Migration runner + postgres/ + scylla/
├── internal/
│   ├── config/          # Shared loader
│   ├── constants/       # SINGLE SOURCE OF TRUTH (kafka topics, cache keys, ws events…)
│   ├── db/              # PostgreSQL (GORM) + ScyllaDB (gocql)
│   ├── domain/          # Domain handlers (message, conversation, user)
│   ├── logger/          # Zap setup
│   ├── middleware/      # HTTP middlewares (auth, …)
│   ├── models/          # GORM models
│   ├── services/        # JWT, cache, ...
│   ├── transport/
│   │   ├── kafka/       # Producer / Consumer + adapter, providers
│   │   └── websocket/   # Socket.IO server, redis adapter, presence, handlers
│   ├── modules/         # Feature modules (clean architecture)
│   │   ├── auth/        #   {module}.router|controller|service|repository|dto|dig.go
│   │   ├── user/
│   │   ├── relationships/
│   │   ├── conversation/
│   │   ├── message/
│   │   └── health/
│   └── utils/           # HTTP helpers, cache key helpers
├── infra/
│   ├── docker/          # Dockerfiles
│   ├── monitoring/      # Loki, Grafana, Alloy configs
│   ├── nginx/
│   └── scripts/
├── clients/
│   ├── web/             # React + Vite + Tailwind
│   └── apps/            # Flutter mobile
├── docker-compose.yml       # Full production stack
├── docker-compose.dev.yml   # Dev infrastructure
├── docker-compose.test.yml
├── Makefile
└── docs/                # Swagger output
```

### Key Patterns

#### 1. Centralized constants

All Kafka topics, cache keys, and WebSocket events are defined in [internal/constants/constant.go](internal/constants/constant.go). No hard-coded strings.

#### 2. Service-specific config validation

Each service validates its own config with `go-playground/validator`:

- API: full stack (DB, Redis, Scylla, Kafka, JWT, …)
- Chat: minimal (WebSocket Redis, Kafka, JWT)

#### 3. Dependency Injection (Uber Dig)

Each module exposes a `Provider` in `{module}.dig.go`. The container is built in `cmd/{service}/container.go`.

#### 4. Event-Driven

```text
API → produce → Kafka topic → Chat consume → WS broadcast to user rooms
```

#### 5. Distributed WebSocket

Both services share `internal/transport/websocket` + Redis Adapter, enabling horizontal scaling.

#### 6. Clean architecture layering

Controller (thin) → Service (business logic) → Repository (data access).

#### 7. Generic typed HTTP response

All REST responses use the shared response envelope in `internal/utils/http.go` with `success`, `status`, `traceId`, `timestamp`, `path`, and either `data` or `error`.

#### 8. Storage ownership

The current schema separates account data from chat data:

- **PostgreSQL** owns users and relationships (`cmd/migrations/postgres`).
- **ScyllaDB** owns conversations, conversation members, direct conversation pairs, messages, per-user conversation inboxes, read markers, and hidden conversations (`cmd/migrations/scylla`).
- **Redis** owns cache entries, Socket.IO fanout state, presence counters, last-active timestamps, and short-lived typing/idempotency keys.

## Getting Started

### Requirements

- Go 1.24.5+
- Docker & Docker Compose
- (Optional) Make, Yarn (for the web client), Flutter (for the mobile client)

### Quick start — full stack with Docker

```bash
# Build & start all services + infrastructure + monitoring
docker compose up -d

# Status
docker compose ps
```

### Local development

```bash
# 1. Start infrastructure (postgres, redis, scylla, kafka)
make dev-up

# 2. Apply migrations
make migrate-up

# 3. (Optional) Seed 100 test users (test1@gmail.com … test100@gmail.com / 123456)
make seed

# 4. Run the two services in separate terminals
make run-api      # :8080
make run-chat     # :8081

# 5. (Optional) Web UI
make web-install
make web-dev      # :3000
```

### Endpoints

- **API REST:** `http://localhost:8080/api/...`
- **API WebSocket:** `ws://localhost:8080/socket.io/`
- **Swagger:** `http://localhost:8080/swagger/index.html`
- **Chat WebSocket:** `ws://localhost:8081/socket.io/`
- **Health (API):** `http://localhost:8080/api/health`
- **Health (Chat):** `http://localhost:8081/health`
- **Web UI (dev):** `http://localhost:3000`
- **Grafana:** `http://localhost:3001`

## Configuration

The two services read separate env files:

- **API Service** — `.env`
- **Chat Service** — `.env.chat`

These values **must match** across both services:

- `JWT_SECRET` — minimum 32 characters
- `WEBSOCKET_REDIS_*` — must point to the same Redis instance / DB
- `KAFKA_BROKERS` — same cluster

Example `.env` (API):

```env
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
GIN_MODE=debug

DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_server_dev
DB_USER=postgres
DB_PASSWORD=postgres123

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123
REDIS_DB=0

WEBSOCKET_REDIS_HOST=localhost
WEBSOCKET_REDIS_PORT=6379
WEBSOCKET_REDIS_PASSWORD=redis123
WEBSOCKET_REDIS_DB=1

SCYLLA_HOST=localhost
SCYLLA_PORT=9042
SCYLLA_KEYSPACE=chat_server
SCYLLA_CONSISTENCY=LOCAL_QUORUM

KAFKA_BROKERS=localhost:9092

JWT_SECRET=your-secret-key-min-32-chars-here
JWT_EXPIRY=24h

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

`.env.chat` only keeps `WEBSOCKET_REDIS_*`, `KAFKA_BROKERS`, `JWT_SECRET` / `JWT_EXPIRY`.

## Migrations

The migration service handles PostgreSQL (`.sql`) and ScyllaDB (`.cql`) in parallel.

```bash
make migrate-up        # apply all
make migrate-down      # rollback (interactive, asks for steps)
make migrate-version   # show current versions
make migrate-create    # create a new migration pair (PG + Scylla, same timestamp)
```

Environment variables:

- `MIGRATION_ACTION` — `up` | `down` | `version`
- `MIGRATE_DB` — `postgres` | `scylla` | `all` (default `all`)
- `MIGRATION_STEPS` — number of rollback steps

Files:

- `cmd/migrations/postgres/{ts}_{name}.{up|down}.sql`
- `cmd/migrations/scylla/{ts}_{name}.{up|down}.cql`

ScyllaDB migrations automatically replace `chat_keyspace` with the actual keyspace at runtime.

## Kafka Topics

Defined in [internal/constants/constant.go](internal/constants/constant.go):

- `CHAT.MESSAGE.CREATED` — new message
- `CHAT.MESSAGE.UPDATED` — message edited
- `CHAT.MESSAGE.DELETED` — message deleted
- `CHAT.CONVERSATION.CREATED` — conversation created
- `CHAT.CONVERSATION.UPDATED` — conversation updated
- `CHAT.CONVERSATION.DELETED` — conversation deleted
- `CHAT.USER.TYPING` — typing indicator

Consumer group: `CHAT-SERVICE-CONSUMERS`.

## WebSocket Events (server → client)

- All events arrive on the `message` channel as `{ type, data }`.
- `NEW_MESSAGE` — new message
- `MESSAGE_UPDATED` / `MESSAGE_DELETED` — message edits / deletions
- `CONVERSATION_CREATED` / `CONVERSATION_UPDATED` / `CONVERSATION_DELETED` — conversation lifecycle
- `USER_TYPING` / `USER_STOP_TYPING` — typing

Client connection with JWT:

```js
const socket = io('http://localhost:8080', { auth: { token: jwt } });
socket.on('message', ({ type, data }) => {
  if (type === 'NEW_MESSAGE') {
    // ...
  }
});
```

## REST API (main endpoints)

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET|PUT /api/user/me`, `POST /api/user/upload`, `GET /api/user/search`
- `POST /api/relationships/request`, `PUT /api/relationships/:id/respond`, `DELETE /api/relationships/:id/cancel`, `DELETE /api/relationships/:id/unfriend`, `POST /api/relationships/block`
- `GET /api/conversations`, `GET /api/conversations/direct/check`, `POST /api/conversations/direct`, `POST /api/conversations/group`, `GET /api/conversations/:id`, `PUT /api/conversations/:id/read`, `POST /api/conversations/:id/hide`, `POST /api/conversations/:id/unhide`, `POST /api/conversations/typing`
- `POST /api/messages`, `POST /api/messages/direct`, `GET /api/messages/:conversationId`, `PATCH /api/messages/:conversationId/:messageId`, `DELETE /api/messages/:conversationId/:messageId`
- `GET /api/health`

See Swagger UI for the full reference.

## Useful Make Commands

```bash
make help                 # list everything
make dev-up / dev-down    # infrastructure
make run-api / run-chat   # run a service
make build                # build both binaries
make build-migrate / build-seed
make migrate-up / down / version / create
make seed                 # 100 test users
make db-shell / redis-cli / scylla-cli / kafka-cli
make swagger              # generate Swagger
make web-dev / web-build  # web client
```

## Docker

`docker-compose.yml` at the root runs the full stack: postgres, redis, scylla, kafka, migrate, api, chat, web, loki, grafana, alloy.

`docker-compose.dev.yml` runs infrastructure only for local development.

Horizontal scaling:

```bash
docker compose up -d --scale api=3 --scale chat=3
```

## Observability

- Centralized logs via **Alloy → Loki → Grafana**
- Trace IDs propagate across HTTP → Kafka → WebSocket
- Health endpoints for liveness / readiness probes

## Contributing

1. Fork and create a `feature/xxx` branch
2. Use Conventional Commits
3. Run `go fmt`, `make mod-tidy`; do not add unnecessary comments (the codebase follows a no-comments style)
4. Open a PR

## License

MIT.
