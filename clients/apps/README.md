# Chat App — Flutter Mobile Client

Flutter mobile client for the **Chat Server** microservices backend. Talks to the API service over HTTP for REST and Socket.IO for real-time messaging.

Targets: Android, iOS, Linux, macOS, Windows (Flutter desktop).

## Stack

- **Flutter SDK:** Dart `^3.9.2`
- **State management:** `flutter_riverpod` ^3.3.1
- **Routing:** `go_router` ^17.2.3 (auth-aware redirect)
- **HTTP:** `dio` ^5.9.2
- **WebSocket:** `socket_io_client` ^3.1.4
- **Persistence:** `shared_preferences` ^2.5.5 (session/token)
- **Utilities:** `uuid` (client-minted message IDs), `intl`

## Project Layout

```text
lib/
├── main.dart              # App entry, GoRouter + auth redirect, ProviderScope
├── config/
│   └── env.dart           # API base URL per platform (web / android emulator / desktop)
├── models/
│   └── models.dart        # User, Conversation, Message, AuthState, ...
├── providers/
│   └── providers.dart     # Riverpod providers (authProvider, conversations, messages)
├── services/
│   ├── api_service.dart   # Dio REST client (auth, conversations, messages, users)
│   └── socket_service.dart# Socket.IO client (connect with JWT, real-time events)
└── screens/
    ├── login_screen.dart
    ├── register_screen.dart
    ├── home_screen.dart       # Conversation list
    ├── chat_screen.dart       # Conversation + message stream
    └── user_search_screen.dart
```

Routes (declared in `main.dart`):

- `/login`, `/register` — public
- `/` — home (conversation list), requires auth
- `/chat/:id` — chat screen, accepts `Conversation` via `state.extra`

The router auto-redirects unauthenticated users to `/login` and signed-in users away from auth screens.

## Backend Connection

`lib/config/env.dart` resolves the API base URL by platform:

- **Web:** `http://localhost:8080`
- **Android emulator:** `http://10.0.2.2:8080` (host loopback)
- **Desktop / iOS simulator:** `http://localhost:8080`

WebSocket (Socket.IO) uses the same base URL. JWT is sent on the Socket.IO `auth` payload; REST calls use a Bearer header via Dio interceptors.

To point at a different backend (LAN device, staging), edit `lib/config/env.dart`.

## Prerequisites

- Flutter SDK installed and on `PATH` — `flutter doctor` should be clean for your target platform
- A running Chat Server backend (`make dev-up && make run-api && make run-chat` from the repo root)
- Platform tooling:
  - **Android:** Android Studio + an emulator or USB device
  - **iOS:** Xcode (macOS only)
  - **Desktop:** see `flutter config` for enabling `windows`/`macos`/`linux` desktop

## Setup

```bash
cd clients/apps
flutter pub get
```

## Run

```bash
# List available devices
flutter devices

# Run on the default device
flutter run

# Or pick a device explicitly
flutter run -d chrome
flutter run -d windows
flutter run -d <android-device-id>
```

When running on an Android emulator against a backend on your host machine, keep `10.0.2.2` (the default in `env.dart`). On a physical device, replace the host with your machine's LAN IP.

## Build

```bash
# Android
flutter build apk --release
flutter build appbundle --release

# iOS (macOS only)
flutter build ios --release

# Desktop
flutter build windows --release
flutter build macos --release
flutter build linux --release

# Web
flutter build web --release
```

## Real-time Behavior

- Auth flow stores JWT in `shared_preferences`; `tryRestoreSession()` runs on startup.
- Socket.IO connects after login using the JWT and listens to backend events such as `NEW_MESSAGE`, `MESSAGE_UPDATED`, `MESSAGE_DELETED`, `CONVERSATION_CREATED/UPDATED/DELETED`, `USER_TYPING`, `USER_ONLINE`/`USER_OFFLINE`.
- Sending a message mints a `clientMsgId` (via `uuid`) for optimistic UI and server-side idempotency, matching the backend contract.

## Test

```bash
flutter test
```

## Troubleshooting

- **Cannot reach API from Android emulator** — confirm the backend is bound to `0.0.0.0:8080` and that `env.dart` returns `10.0.2.2` for Android.
- **Socket disconnects right after connecting** — usually an expired/invalid JWT; log in again or check the backend `JWT_SECRET` matches across API and Chat services.
- **CORS errors on web** — set `CORS_ALLOWED_ORIGINS` in the API `.env` to include the Flutter web origin (e.g. `http://localhost:port`).
- **Build issues** — run `flutter clean && flutter pub get`, then rebuild.
