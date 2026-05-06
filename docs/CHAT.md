# Chat Server — WebSocket Reference

The real-time layer is **Socket.IO v3** with a Redis adapter. Both the API service (`:8080`) and the Chat service (`:8081`) expose the same WebSocket endpoint and share state through the adapter, so a client can connect to either.

- **Endpoint:** `ws://<host>/socket.io/`
- **Transport:** Socket.IO over WebSocket (auto-fallback to long-polling if needed by the client)
- **Auth:** JWT (same secret as `JWT_SECRET` for the API service)

## Connecting

### Client SDK example (`socket.io-client`)

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080', {
  auth: { token: '<JWT from POST /api/auth/login>' },
  // alternatively: query: { token: '<JWT>' }
  transports: ['websocket'],
});

socket.on('connect', () => console.log('connected', socket.id));
socket.on('connect_error', (err) => console.error('connect error:', err.message));
socket.on('disconnect', (reason) => console.log('disconnected:', reason));
```

### Auth contract

The server reads the JWT from one of two places, in order:

1. `auth.token` on the handshake payload (preferred).
2. `?token=<jwt>` on the connection URL.

If neither is provided, the server rejects the handshake with `access_token is required`. If the token is invalid or expired the server rejects with `Unauthorized`.

After authentication succeeds, the server:

1. Joins the socket to a private room `user:<userId>`.
2. Records presence (Redis-backed). The first connection per user fires the "user came online" lifecycle.

### Multi-device

A user may have many sockets connected at the same time (web + phone + desktop). All sockets for the same user are in the same `user:<userId>` room — every server-to-client event is broadcast to every device. Presence tracking is reference-counted: the user is considered online while at least one socket is connected.

## Event Model

There are two channels:

| Channel | Direction | Purpose |
| ------- | --------- | ------- |
| Native Socket.IO events | client ↔ server | `typing` / `stop_typing` / `disconnect` |
| `message` event | server → client | All domain events (NEW_MESSAGE, CONVERSATION_CREATED, …) wrapped in a `{ type, data }` envelope |

All domain events are emitted on the **single Socket.IO event name** `message`, with the actual event type carried in the payload. This keeps client code simple — one listener handles every domain push.

### Server → client envelope

```json
{
  "type": "NEW_MESSAGE",
  "data": { /* event-specific payload */ }
}
```

Listen with:

```js
socket.on('message', (frame) => {
  switch (frame.type) {
    case 'NEW_MESSAGE': handleNew(frame.data); break;
    case 'MESSAGE_UPDATED': handleEdit(frame.data); break;
    case 'MESSAGE_DELETED': handleDelete(frame.data); break;
    case 'CONVERSATION_CREATED': handleConvCreated(frame.data); break;
    case 'CONVERSATION_UPDATED': handleConvUpdated(frame.data); break;
    case 'USER_TYPING': handleTyping(frame.data); break;
    default: console.warn('unknown event', frame.type);
  }
});
```

### `type` values currently emitted

| `type` | Source | Trigger |
| ------ | ------ | ------- |
| `NEW_MESSAGE`            | Kafka `CHAT.MESSAGE.CREATED` | Any member of a conversation sends a message |
| `MESSAGE_UPDATED`        | Kafka `CHAT.MESSAGE.UPDATED` | Sender edits an existing message |
| `MESSAGE_DELETED`        | Kafka `CHAT.MESSAGE.DELETED` | Sender deletes a message |
| `CONVERSATION_CREATED`   | Kafka `CHAT.CONVERSATION.CREATED` | A new conversation involving the user is created |
| `CONVERSATION_UPDATED`   | Kafka `CHAT.CONVERSATION.UPDATED` | Conversation metadata changes |
| `USER_TYPING`            | Client `typing` or `POST /api/conversations/typing` | Another member is typing |
| `USER_STOP_TYPING`       | Client `stop_typing` | Another member stopped typing |

See [`internal/constants/constant.go`](../internal/constants/constant.go) for the canonical names.

---

## Server → Client Events

### `NEW_MESSAGE`

```json
{
  "type": "NEW_MESSAGE",
  "data": {
    "conversation": {
      "id": "ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd",
      "type": "direct",
      "name": "Bob",
      "avatar": "https://...",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "participantCount": 2
    },
    "message": {
      "id": "fa7f9g87-ba3f-7a68-e2d9-ffh38d37dhge",
      "conversationId": "ea6e8f76-...",
      "senderId": "ca4c6d54-...",
      "senderName": "John Doe",
      "senderAvatar": "https://...",
      "type": "text",
      "content": "Hello, how are you?",
      "metadata": "",
      "status": "sent",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "replyToId": "",
      "clientMsgId": "alice-1"
    }
  }
}
```

The same envelope is delivered to **every active socket of every conversation member**, including the sender's other devices (multi-device sync).

### `MESSAGE_UPDATED`

Same payload shape as `NEW_MESSAGE`. The `message.content` and `updatedAt` reflect the edit. Clients should patch the message in place by `message.id`.

### `MESSAGE_DELETED`

```json
{
  "type": "MESSAGE_DELETED",
  "data": {
    "conversation": { /* same shape as above */ },
    "messageId": "fa7f9g87-ba3f-7a68-e2d9-ffh38d37dhge"
  }
}
```

Clients should remove or strike through the message with this `id`. The server keeps a tombstone in storage; subsequent fetches will not return it.

### `CONVERSATION_CREATED`

```json
{
  "type": "CONVERSATION_CREATED",
  "data": {
    "id": "ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd",
    "type": "direct",
    "name": "Bob",
    "avatar": "https://...",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "participantCount": 2,
    "lastMessageText": "Hi Bob!",
    "lastMessageAt": "2024-01-15T10:30:00Z",
    "unreadCount": 1,
    "participants": [
      { "userId": "...", "username": "alice", "avatar": "..." },
      { "userId": "...", "username": "bob",   "avatar": "..." }
    ]
  }
}
```

Emitted to every participant the moment a conversation is created (e.g. via `POST /messages/direct`). The `unreadCount` differs per recipient — the sender sees `0`, the recipient sees `1`.

### `CONVERSATION_UPDATED`

Same payload shape as `CONVERSATION_CREATED`. Used when conversation metadata changes (rename, avatar change, member join/leave, last message preview update).

### `USER_TYPING`

```json
{
  "type": "USER_TYPING",
  "data": {
    "conversationId": "ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd",
    "userId": "ca4c6d54-870c-4735-b9a6-cce05a04aedb",
    "username": "alice",
    "time": "2024-01-15T10:30:00Z"
  }
}
```

Fanned out to every member of the conversation **except the typing user**. The `time` field is when the indicator was raised — clients should auto-clear after ~3–5 seconds without a refresh.

### `USER_STOP_TYPING`

Same payload as `USER_TYPING` but signals the user has stopped. Clients can clear immediately on this event.

---

## Client → Server Events

### `typing`

Notify the server that the caller is typing in a specific conversation. The server fans out a `USER_TYPING` to other members.

```js
socket.emit('typing', { conversation_id: 'ea6e8f76-a92e-6957-d1c8-eeg27c26cgfd' });
```

| Field | Required | Notes |
| ----- | -------- | ----- |
| `conversation_id` | ✅ | UUID. Caller must be a member; otherwise the event is silently ignored. |

There is no acknowledgement and no error pushed back — invalid payloads are dropped server-side and logged.

### `stop_typing`

Signal that the caller stopped typing. Triggers `USER_STOP_TYPING` to other members.

```js
socket.emit('stop_typing', { conversation_id: 'ea6e8f76-...' });
```

Same payload as `typing`.

### `disconnect`

Built-in Socket.IO event. The server cleans up presence reference counts when the last socket of a user disconnects.

> Note: there is currently **no** client→server `send_message` event. To send a message, call `POST /api/messages` (or `POST /api/messages/direct`). The result is delivered to every member's WebSocket as a `NEW_MESSAGE` push. Sending over REST keeps idempotency (`clientMsgId`) and validation centralized.

---

## Lifecycle Cheatsheet

```
1. Client opens TCP/WS connection ──► Socket.IO handshake
2. Server middleware reads JWT (auth.token or ?token=)
   └─ invalid → reject with "Unauthorized"
3. Server joins socket to room   user:<userId>
4. Server bumps presence counter (Redis)
   └─ first socket for user → user is online
5. Client subscribes:
       socket.on('message', frame => …)
       socket.on('disconnect', reason => …)
6. Server emits domain events to user:<userId> rooms as Kafka events arrive
7. Client emits 'typing' / 'stop_typing' as needed
8. Client closes
   └─ presence counter decremented
   └─ last socket gone → user is offline
```

---

## End-to-End Walkthrough

Two browser tabs for the same user, one chat between Alice and Bob.

```js
// ── Tab A (Alice) ─────────────────────────────────────────────
const alice = io('http://localhost:8080', { auth: { token: aliceJwt } });

alice.on('message', (f) => {
  if (f.type === 'NEW_MESSAGE')        renderIncoming(f.data.message);
  if (f.type === 'MESSAGE_UPDATED')    patchMessage(f.data.message);
  if (f.type === 'MESSAGE_DELETED')    removeMessage(f.data.messageId);
  if (f.type === 'CONVERSATION_CREATED') addConvToInbox(f.data);
  if (f.type === 'USER_TYPING')        showTyping(f.data);
  if (f.type === 'USER_STOP_TYPING')   hideTyping(f.data);
});

// Alice starts typing
alice.emit('typing',      { conversation_id: convId });
// Alice stops typing
alice.emit('stop_typing', { conversation_id: convId });

// Alice sends a message via REST (idempotent retry possible)
await fetch('/api/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aliceJwt}` },
  body: JSON.stringify({
    conversationId: convId,
    type: 'text',
    content: 'hi',
    clientMsgId: crypto.randomUUID(),
  }),
});
// → Both Alice's tabs receive { type: 'NEW_MESSAGE' } over the WebSocket
// → Bob's connected sockets also receive it
```

---

## Operational Notes

- **Horizontal scale.** API and Chat services share the same Redis Adapter database (`WEBSOCKET_REDIS_*` env). Adding more replicas is safe — Socket.IO syncs rooms across instances via Redis.
- **Where do events come from?** All server-emitted events flow through Kafka first (topics `CHAT.MESSAGE.*`, `CHAT.CONVERSATION.*`, `CHAT.USER.TYPING`). The Chat service consumes Kafka and emits to Socket.IO; the API service can do the same when running in dual-mode.
- **Ordering.** Per `conversationId`, message events are ordered: producers use the conversation id as the Kafka partition key, and consumers preserve order per partition. Cross-conversation ordering is not guaranteed.
- **At-least-once.** A message event may be delivered more than once after a Kafka rebalance; clients should de-dupe by `message.id`.
- **Reconnection.** Socket.IO clients automatically reconnect with exponential backoff. After reconnect, the client should refetch the latest messages (`GET /api/messages/:conversationId`) — the WebSocket only delivers events that occur **while connected**, not history.
- **Tracing.** Every Kafka message carries a `ts` header. Server logs include the `traceId` from the originating HTTP request; correlate WebSocket emits with REST calls via that id.
