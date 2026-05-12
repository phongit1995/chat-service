# Repository Guidelines

## Project Structure & Module Organization
`cmd/api`, `cmd/chat`, and `cmd/migrations` are Go entry points for API, realtime chat, and schema jobs. `internal/modules/*` holds feature slices like `auth`, `user`, `conversation`, `message`, and `relationships`. `internal/transport/*` wires Kafka and Socket.IO; `internal/services`, `internal/utils`, and `internal/db` hold shared logic and persistence. `clients/web` is the React + Vite UI, `clients/apps` is Flutter, `tests/api/tests` is the ordered Node integration suite, and `infra`, `docker-compose*.yml`, and `docs` cover deployment and generated API docs.

## App Features
Main behavior: JWT auth, user profiles, conversations, direct messages, members, unread/read state, realtime delivery through Socket.IO + Redis + Kafka, and shared backend contracts for web and mobile. PostgreSQL stores identity and relationships; ScyllaDB stores chat data; Redis handles cache and presence.

## Build, Test, and Development Commands
- `make dev-up` / `make dev-down`: start or stop local infra from `docker-compose.dev.yml`.
- `make run-api` / `make run-chat`: run Go services and write logs to `logs/`.
- `make build` (or `make build-api`, `make build-chat`): compile binaries into `bin/`.
- `make migrate-up` / `make migrate-down`: apply or roll back database migrations.
- `make web-install`, `make web-dev`, `make web-build`, `make web-lint`: manage `clients/web/`.
- `cd tests/api && npm test`: run the ordered API/WebSocket suite.
- `flutter analyze` / `flutter test`: run from `clients/apps/`.

## Coding Style & Naming Conventions
Use `gofmt` for Go. Keep backend filenames in the module pattern `*.router.go`, `*.controller.go`, `*.service.go`, `*.repository.go`, `*.dto.go`, `*.dig.go`. Exported Go names use PascalCase; package names stay short and lowercase. TypeScript and Dart use 2-space indentation, single-purpose components, and PascalCase for React components/widgets. Keep file names descriptive, like `ChatSidebar.tsx` or `message_bubble.dart`.

## Testing Guidelines
`tests/api` runs numbered scenarios in order (`01-health.test.js` through `99-unread-realistic.test.js`). Add new cases with the next prefix so `run-all.js` picks them up. Prefer focused tests for endpoint changes and include WebSocket coverage when behavior touches realtime paths. No formal Go coverage gate is enforced.

## Commit & Pull Request Guidelines
Git history uses conventional prefixes such as `feat:`, `fix:`, `refactor:`, and `docs:`. Keep commit subjects short, imperative, and scoped. PRs should explain what changed, why, and which commands were run. Include screenshots for UI work plus any migration or env changes needed to verify locally.

## Security & Configuration Tips
Do not commit real secrets. Use `.env` for API and `.env.chat` for Chat, seeded from `.env.example`. Keep shared auth, Kafka, Redis, and database values consistent across both services.
