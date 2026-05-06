# Chat Server — REST API Reference

Base URL: `http://localhost:8080/api` (or `http://<host>:8888/api` when running through the test nginx).

Interactive Swagger UI: `http://localhost:8080/swagger/index.html`.

## Conventions

### Authentication

Most endpoints require a JWT obtained from `POST /auth/login`. Send it on every protected request:

```
Authorization: Bearer <token>
```

Public endpoints (no auth needed): `POST /auth/register`, `POST /auth/login`, `GET /health`.

### Standard Response Envelope

All successful responses are wrapped:

```json
{
  "success": true,
  "status": 200,
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-05-06T10:00:00Z",
  "path": "/api/user/me",
  "data": { /* endpoint-specific payload */ }
}
```

Errors follow the same envelope, with `success: false` and an `error` string instead of `data`:

```json
{
  "success": false,
  "status": 401,
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-05-06T10:00:00Z",
  "path": "/api/user/me",
  "error": "invalid or expired token"
}
```

`traceId` propagates through Kafka and WebSocket — use it to correlate logs across services.

### Common Status Codes

| Code | Meaning |
| ---- | ------- |
| 200  | OK |
| 201  | Created |
| 400  | Bad Request — payload validation failed |
| 401  | Unauthorized — missing/invalid token |
| 403  | Forbidden — authenticated but not allowed |
| 404  | Not Found |
| 409  | Conflict — duplicate (e.g. email already used) |
| 429  | Too Many Requests — rate limit hit |
| 500  | Internal Server Error |

### Endpoint Map

| Group | Path | Auth |
| ----- | ---- | ---- |
| Health | `GET /health` | ❌ |
| Auth | `POST /auth/register` | ❌ |
| Auth | `POST /auth/login` | ❌ |
| User | `GET /user/me` | ✅ |
| User | `PUT /user/me` | ✅ |
| User | `POST /user/upload` | ✅ |
| User | `GET /user/search` | ✅ |
| Relationships | `POST /relationships/request` | ✅ |
| Relationships | `PUT /relationships/:id/respond` | ✅ |
| Relationships | `DELETE /relationships/:id/cancel` | ✅ |
| Relationships | `DELETE /relationships/:id/unfriend` | ✅ |
| Relationships | `POST /relationships/block` | ✅ |
| Relationships | `DELETE /relationships/:id/unblock` | ✅ |
| Relationships | `GET /relationships/pending` | ✅ |
| Relationships | `GET /relationships/sent` | ✅ |
| Relationships | `GET /relationships/friends` | ✅ |
| Relationships | `GET /relationships/blocked` | ✅ |
| Conversations | `GET /conversations/direct/check` | ✅ |
| Conversations | `POST /conversations/direct` | ✅ |
| Conversations | `POST /conversations/group` | ✅ |
| Conversations | `GET /conversations` | ✅ |
| Conversations | `PUT /conversations/:id/read` | ✅ |
| Conversations | `POST /conversations/:id/hide` | ✅ |
| Conversations | `POST /conversations/:id/unhide` | ✅ |
| Conversations | `POST /conversations/typing` | ✅ |
| Messages | `POST /messages` | ✅ |
| Messages | `POST /messages/direct` | ✅ |
| Messages | `GET /messages/:conversationId` | ✅ |
| Messages | `PATCH /messages/:conversationId/:messageId` | ✅ |
| Messages | `DELETE /messages/:conversationId/:messageId` | ✅ |

---

## Health

### GET `/health`

Liveness/readiness probe. Returns DB and dependency status.

**Response 200**

```json
{
  "success": true,
  "status": 200,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "services": { "database": "healthy" }
  }
}
```

---

## Auth

### POST `/auth/register`

Create a new account.

**Request**

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "avatar": "https://example.com/avatar.jpg"
}
```

| Field | Rules |
| ----- | ----- |
| `username` | required, 3–50 chars |
| `email` | required, RFC-5322 |
| `password` | required, ≥6 chars |
| `full_name` | optional, ≤100 chars |
| `avatar` | optional, must be a URL |

**Response 201**

```json
{
  "success": true,
  "status": 201,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com",
      "fullName": "John Doe",
      "avatar": "https://example.com/avatar.jpg"
    },
    "message": "Registration successful. Please login to continue."
  }
}
```

Errors: `400` invalid payload, `409` username/email taken.

---

### POST `/auth/login`

Authenticate and obtain a JWT.

**Request**

```json
{ "email": "john@example.com", "password": "password123" }
```

**Response 200**

```json
{
  "success": true,
  "status": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "john_doe",
      "email": "john@example.com"
    }
  }
}
```

Errors: `400` malformed body, `401` wrong credentials, `429` rate-limited.

---

## User

All endpoints require `Authorization: Bearer <token>`.

### GET `/user/me`

Return the authenticated user's profile.

**Response 200**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "john_doe",
    "email": "john@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "phone": "+84987654321",
    "fullName": "John Doe",
    "bio": "Software developer",
    "dateOfBirth": "1990-01-01",
    "customInfo": { "theme": "dark", "language": "en" },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### PUT `/user/me`

Update profile fields. All fields are optional; send only what's changing.

**Request**

```json
{
  "avatar": "https://example.com/new.jpg",
  "phone": "+84987654321",
  "fullName": "John Doe",
  "bio": "Backend engineer",
  "dateOfBirth": "1990-01-01",
  "customInfo": { "theme": "dark" }
}
```

**Response 200** — same shape as `GET /user/me`.

---

### POST `/user/upload`

Upload an avatar. `multipart/form-data` with field `file`. Returns Cloudinary URLs.

**Response 200**

```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/demo/image/upload/avatars/user123.webp",
    "secureUrl": "https://res.cloudinary.com/demo/image/upload/avatars/user123.webp",
    "publicId": "avatars/user123",
    "format": "webp",
    "width": 400,
    "height": 400
  }
}
```

---

### GET `/user/search?q=<term>`

Search users by `username`, `email`, or `fullName`.

**Query**

| Param | Required | Notes |
| ----- | -------- | ----- |
| `q`   | ✅ | Free-text search term |
| `limit` | ❌ | Default page size (e.g. 20) |

**Response 200**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-...",
        "username": "alice",
        "email": "alice@example.com",
        "fullName": "Alice",
        "avatar": "https://...",
        "bio": "QA engineer"
      }
    ],
    "total": 1
  }
}
```

---

## Relationships

### POST `/relationships/request`

Send a friend request.

**Request**

```json
{ "addresseeId": "550e8400-e29b-41d4-a716-446655440001" }
```

**Response 201**

```json
{
  "success": true,
  "data": {
    "id": "rel-uuid",
    "requesterId": "...",
    "addresseeId": "...",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### PUT `/relationships/:id/respond`

Accept or reject an incoming request.

**Request**

```json
{ "action": "accept" }
```

`action` ∈ `{ "accept", "reject" }`.

**Response 200** — `RelationshipResponse` with new `status` (`accepted` / `rejected`).

---

### DELETE `/relationships/:id/cancel`

Cancel an outgoing pending request you sent. **Response 200** — `{ "success": true }`.

### DELETE `/relationships/:id/unfriend`

Remove an existing friendship. **Response 200** — `{ "success": true }`.

### POST `/relationships/block`

```json
{ "addresseeId": "550e8400-..." }
```

Block another user. **Response 201** — `RelationshipResponse` with `status: "blocked"`.

### DELETE `/relationships/:id/unblock`

Reverse a block. **Response 200**.

### GET `/relationships/pending`

Friend requests waiting on the caller's response.

```json
{
  "success": true,
  "data": {
    "relationships": [
      {
        "id": "rel-uuid",
        "requesterId": "...",
        "addresseeId": "...",
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00Z",
        "requester": { "id": "...", "username": "alice", "email": "alice@example.com" }
      }
    ],
    "total": 1
  }
}
```

### GET `/relationships/sent`

Outgoing pending requests sent by the caller. Same shape as `/pending`.

### GET `/relationships/friends`

Accepted friendships of the caller.

```json
{
  "success": true,
  "data": {
    "friends": [
      {
        "id": "user-uuid",
        "username": "bob",
        "email": "bob@example.com",
        "avatar": "https://...",
        "fullName": "Bob",
        "friendAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

### GET `/relationships/blocked`

Users the caller has blocked. Same shape as `/friends`.

---

## Conversations

### GET `/conversations/direct/check?recipientId=<uuid>`

Check whether a 1:1 conversation already exists between the caller and `recipientId`.

**Response 200**

```json
{ "success": true, "data": { "exists": true, "conversationId": "ea6e8f76-..." } }
```

### POST `/conversations/direct`

Create (or fetch) a direct conversation.

**Request**

```json
{ "recipientId": "ca4c6d54-870c-4735-b9a6-cce05a04aedb" }
```

**Response 201**

```json
{
  "success": true,
  "data": {
    "id": "ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd",
    "type": "direct",
    "name": "Bob",
    "avatar": "https://...",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "participantCount": 2,
    "unreadCount": 0,
    "isNew": true
  }
}
```

`isNew` is `true` only on the first call. Subsequent calls return the existing conversation with `isNew: false`.

### POST `/conversations/group`

```json
{
  "name": "Project Team",
  "participantIds": [
    "ca4c6d54-870c-4735-b9a6-cce05a04aedb",
    "da5d7e65-981d-5846-c0b7-ddf16b15bfec"
  ]
}
```

**Response 201** — `ConversationResponse` with `type: "group"`.

### GET `/conversations`

Inbox: every conversation the caller participates in, ordered by latest activity.

**Response 200**

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "ea6e8f76-...",
        "type": "direct",
        "name": "Bob",
        "lastMessageText": "see you",
        "lastMessageAt": "2024-01-15T15:45:00Z",
        "participantCount": 2,
        "unreadCount": 3
      }
    ],
    "total": 1
  }
}
```

### PUT `/conversations/:id/read`

Mark a conversation as read up to the latest message. Resets `unreadCount` to `0`. **Response 200** — `{ "success": true }`.

### POST `/conversations/:id/hide`

Soft-hide a conversation from the caller's inbox. The conversation reappears automatically when a new message arrives. **Response 200**.

### POST `/conversations/:id/unhide`

Explicitly unhide. **Response 200**.

### POST `/conversations/typing`

Server-side typing indicator (alternative to the WebSocket `typing` event). Server fans out a `USER_TYPING` WS event to other members.

**Request**

```json
{ "conversationId": "ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd" }
```

**Response 200**

```json
{ "success": true, "message": "Typing indicator sent" }
```

---

## Messages

### POST `/messages`

Send a message into an existing conversation.

**Request**

```json
{
  "conversationId": "ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd",
  "type": "text",
  "content": "Hello, how are you?",
  "metadata": "{\"fileName\":\"image.png\"}",
  "replyToId": "fa7f9g87-ba3f-7a68-e2d9-ffh38d37dhge",
  "clientMsgId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Rules |
| ----- | ----- |
| `conversationId` | required, UUID |
| `type` | required, one of `text` / `image` / `file` / `video` / `audio` |
| `content` | required, ≥1 char |
| `metadata` | optional, opaque JSON string |
| `replyToId` | optional, UUID of the message being replied to |
| `clientMsgId` | optional, ≤64 chars — **mint client-side** for idempotent retries; server returns the same `MessageResponse` for duplicates from the same sender |

**Response 201**

```json
{
  "success": true,
  "data": {
    "id": "fa7f9g87-ba3f-7a68-e2d9-ffh38d37dhge",
    "conversationId": "ea6e8f76-...",
    "senderId": "ca4c6d54-...",
    "senderName": "John Doe",
    "senderAvatar": "https://...",
    "type": "text",
    "content": "Hello, how are you?",
    "metadata": "{\"fileName\":\"image.png\"}",
    "status": "sent",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "replyToId": "ga8g0h98-...",
    "clientMsgId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

The server publishes a `CHAT.MESSAGE.CREATED` Kafka event, which the chat service fans out to all members as a WebSocket `NEW_MESSAGE` event.

### POST `/messages/direct`

Send a message and auto-create a direct conversation if it doesn't exist yet. Useful for "start chat" flows.

**Request**

```json
{
  "recipientId": "ca4c6d54-870c-4735-b9a6-cce05a04aedb",
  "type": "text",
  "content": "Hi!",
  "metadata": "",
  "clientMsgId": "550e8400-..."
}
```

**Response 201** — same `MessageResponse` shape as above. If the conversation was newly created, a `CONVERSATION_CREATED` WebSocket event is also emitted to both users.

### GET `/messages/:conversationId?limit=50&beforeMessageId=<uuid>`

Paginate messages in a conversation, newest first.

**Query**

| Param | Required | Notes |
| ----- | -------- | ----- |
| `limit` | ❌ | default ~50 |
| `beforeMessageId` | ❌ | for pagination, fetch messages older than this id |

**Response 200**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "...",
        "conversationId": "...",
        "senderId": "...",
        "senderName": "John Doe",
        "type": "text",
        "content": "Hello",
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 50
  }
}
```

### PATCH `/messages/:conversationId/:messageId`

Edit a message. Only the original sender may edit. Soft-deleted messages cannot be edited.

**Request**

```json
{ "content": "Updated message content" }
```

**Response 200** — updated `MessageResponse`. Triggers a `MESSAGE_UPDATED` WebSocket event.

### DELETE `/messages/:conversationId/:messageId`

Soft-delete a message. Only the original sender may delete. **Response 200** — `{ "success": true }`. Triggers a `MESSAGE_DELETED` WebSocket event.

---

## End-to-End Examples

### Sign-up + send your first message

```bash
# 1. Register
curl -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}'

# 2. Login → grab .data.token
TOKEN=$(curl -sX POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"secret123"}' \
  | jq -r .data.token)

# 3. Send a direct message (auto-creates conversation)
curl -X POST http://localhost:8080/api/messages/direct \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "recipientId":"ca4c6d54-870c-4735-b9a6-cce05a04aedb",
    "type":"text",
    "content":"Hi Bob!",
    "clientMsgId":"alice-1"
  }'
```

### Idempotent retry on flaky network

If `POST /messages` times out, retry with the same `clientMsgId`. The server returns the original `MessageResponse` (same `id`) without creating a duplicate.

```bash
curl -X POST http://localhost:8080/api/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"conversationId":"...","type":"text","content":"Hi","clientMsgId":"abc-123"}'
# … network blip … retry exactly the same body — same id comes back.
```
