# 📞 Plan: Tính năng Call Audio/Video với LiveKit

> Status: **Draft** — chưa implement. Plan để review trước khi triển khai.
>
> Ngày tạo: 2026-05-14

---

## 1. Quyết định kiến trúc

| Mục | Quyết định | Lý do |
|---|---|---|
| Hosting | **Self-host LiveKit** (Apache 2.0, Go binary) | Free, kiểm soát toàn bộ, đồng nhất stack |
| Deploy | Cùng `docker-compose.yml` với api/chat/web | Tận dụng Redis sẵn có |
| Network | **TCP-only via Vultr public IP** (sub-option 1a) | Cloudflared không pass arbitrary TCP. Mở port 7881 + 5349 trực tiếp |
| Signaling | Qua cloudflared (HTTPS WSS) | Đã có tunnel sẵn |
| Media transport | ICE-TCP (7881) + TURN/TLS (5349) | Không cần UDP — chấp nhận quality giảm chút |
| Platforms | Web + Flutter (iOS/Android/macOS) | Skip Windows/Linux call phase đầu, do flutter-webrtc support nhưng ít user |
| Features phase 1 | 1-1 audio + video call, call history | MVP |
| Features phase 2 | Group call (≤10), screen share, push noti | Sau MVP |
| Recording (egress) | ❌ Skip | Phức tạp, cần Chrome headless container |

---

## 2. Network setup

### 2.1 Ports cần mở trên Vultr firewall

| Port | Protocol | Mục đích | Public IP |
|---|---|---|---|
| 7880 | TCP | Signaling WSS | Qua cloudflared (`livekit.ola-server.click`) |
| **7881** | **TCP** | **ICE-TCP media** | `149.28.138.222:7881` direct |
| **5349** | **TCP/TLS** | **TURN over TLS** | `149.28.138.222:5349` direct |
| ~50000-60000~ | ~UDP~ | Disabled | — |

### 2.2 Cloudflared

- Route `livekit.ola-server.click` → `livekit-server:7880` (WSS signaling)
- Media (7881, 5349) **bypass cloudflared**, hit Vultr public IP trực tiếp

### 2.3 livekit.yaml

```yaml
port: 7880
bind_addresses:
  - ""
rtc:
  tcp_port: 7881
  use_external_ip: true
  external_ip: "149.28.138.222"
  port_range_start: 0          # disable UDP
  port_range_end: 0
keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
redis:
  address: redis:6379
turn:
  enabled: true
  tls_port: 5349
  domain: livekit.ola-server.click
  cert_file: /etc/livekit/tls/fullchain.pem
  key_file: /etc/livekit/tls/privkey.pem
webhook:
  api_key: ${LIVEKIT_API_KEY}
  urls:
    - https://chat.ola-server.click/api/calls/webhook
```

TLS cert cho TURN: Let's Encrypt cho `livekit.ola-server.click`.

---

## 3. Backend (Go) — Phase 1

### 3.1 Module mới

```
internal/modules/call/
├── call.router.go          # Routes /api/calls/*
├── call.controller.go      # HTTP handlers
├── call.service.go         # Token mint, room lifecycle, business logic
├── call.repository.go      # PostgreSQL CRUD bảng calls
├── call.dto.go             # Request/response types
├── call.webhook.go         # LiveKit webhook handler (HMAC verify)
└── call.dig.go             # Uber Dig provider
```

### 3.2 Database schema (PostgreSQL migration mới)

```sql
-- cmd/migrations/postgres/{ts}_create_calls.up.sql
CREATE TABLE calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  caller_id       UUID NOT NULL REFERENCES users(id),
  call_type       VARCHAR(10) NOT NULL CHECK (call_type IN ('audio','video')),
  room_name       VARCHAR(255) UNIQUE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'ringing'
                  CHECK (status IN ('ringing','active','ended','missed','declined')),
  participants    UUID[] NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at     TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_seconds INT
);
CREATE INDEX idx_calls_conv_started ON calls(conversation_id, started_at DESC);
CREATE INDEX idx_calls_status ON calls(status) WHERE status IN ('ringing','active');
```

### 3.3 Constants mới

```go
// internal/constants/constant.go

// Kafka topics
KafkaTopicCallInvited  = "CHAT.CALL.INVITED"
KafkaTopicCallAccepted = "CHAT.CALL.ACCEPTED"
KafkaTopicCallDeclined = "CHAT.CALL.DECLINED"
KafkaTopicCallEnded    = "CHAT.CALL.ENDED"

// WebSocket events (chat service emit → clients)
WebSocketEventIncomingCall = "INCOMING_CALL"
WebSocketEventCallAccepted = "CALL_ACCEPTED"
WebSocketEventCallDeclined = "CALL_DECLINED"
WebSocketEventCallEnded    = "CALL_ENDED"

// Call config
CallRingTimeoutSeconds = 30  // sau 30s không answer → status=missed
```

### 3.4 API endpoints

| Method | Route | Body | Response | Mô tả |
|---|---|---|---|---|
| POST | `/api/calls/start` | `{conversationId, callType}` | `{callId, roomName, token, wsUrl}` | Mint room, token caller, publish Kafka invite |
| POST | `/api/calls/:id/answer` | — | `{token, wsUrl}` | Callee accept, mint token, publish accepted |
| POST | `/api/calls/:id/decline` | — | `{success}` | Update status, publish declined |
| POST | `/api/calls/:id/end` | — | `{success}` | Delete room, update duration |
| GET | `/api/conversations/:id/calls` | — | `{calls: [...]}` | Lịch sử call theo conversation |
| POST | `/api/calls/webhook` | LiveKit payload | `200` | Webhook (room_finished, participant_left) |

### 3.5 Token grant logic

```go
// Pseudo code
func (s *Service) MintToken(userID, roomName string) (string, error) {
    at := auth.NewAccessToken(apiKey, apiSecret).
        SetIdentity(userID.String()).
        SetName(user.Username).
        SetValidFor(1 * time.Hour).
        AddGrant(&auth.VideoGrant{
            RoomJoin:     true,
            Room:         roomName,
            CanPublish:   &boolTrue,
            CanSubscribe: &boolTrue,
        })
    return at.ToJWT()
}
```

### 3.6 Flow 1-1 call

```
A bấm Call (video)
  ├─► API POST /calls/start
  │     ├─► Insert calls row (status=ringing)
  │     ├─► Mint token cho A
  │     ├─► Publish Kafka CHAT.CALL.INVITED {callId, callerId, calleeId, roomName, type}
  │     └─► Return {token, roomName} → A join LiveKit room
  │
  ├─► Chat service consume CHAT.CALL.INVITED
  │     └─► WS emit INCOMING_CALL → B
  │
  ├─► B accept → POST /calls/:id/answer
  │     ├─► Update status=active, answered_at=now
  │     ├─► Mint token cho B
  │     ├─► Publish CHAT.CALL.ACCEPTED → WS CALL_ACCEPTED → A
  │     └─► Return {token} → B join room
  │
  ├─► Hoặc B decline → POST /calls/:id/decline
  │     ├─► status=declined
  │     └─► Publish CHAT.CALL.DECLINED → WS CALL_DECLINED → A
  │
  ├─► Hết call: A hoặc B bấm hang up → POST /calls/:id/end
  │     ├─► RoomServiceClient.DeleteRoom(roomName)
  │     ├─► status=ended, ended_at=now, duration_seconds=…
  │     └─► WS CALL_ENDED → cả 2
  │
  └─► (Timeout) Goroutine 30s sau /start nếu status vẫn=ringing
        ├─► status=missed
        └─► WS CALL_ENDED + system message
```

### 3.7 Webhook handler

LiveKit webhook → API `/api/calls/webhook`:
- Verify HMAC header
- Event `room_finished` → đảm bảo status=ended (idempotent, fallback nếu client không gọi /end)
- Event `participant_left` → log analytics

### 3.8 Call event message trong chat

Khi call kết thúc, insert message vào ScyllaDB:
```
type: "call_event"
content: JSON {callType, status, duration}
metadata: {callId}
```
→ Hiển thị trong message list như "📞 Audio call · 2:34" hoặc "❌ Missed call".

### 3.9 Effort: **6-8 ngày**

---

## 4. Web — Phase 1

### 4.1 Dependencies

```json
{
  "livekit-client": "^2.18.9",
  "@livekit/components-react": "^2.9.20",
  "@livekit/components-styles": "^1.1.6"
}
```

### 4.2 Files mới

```
src/
├── services/call.service.ts          # API client
├── store/callStore.ts                # Zustand
│     state: { incoming?, active?, history[] }
│     actions: startCall, answer, decline, end
├── components/call/
│   ├── IncomingCallModal.tsx         # Full-screen ringing UI
│   ├── CallScreen.tsx                # In-call (uses <LiveKitRoom> + <VideoConference>)
│   ├── CallControls.tsx              # Mute/camera/hang-up custom controls
│   ├── CallButton.tsx                # Trong ChatArea header (audio + video buttons)
│   └── CallHistoryList.tsx           # Hiển thị history trong conv
└── types/call.ts                     # Type definitions
```

### 4.3 Integration với chat hiện tại

- `chat.realtime.ts` thêm 4 WS handlers cho `INCOMING_CALL`/`CALL_ACCEPTED`/`CALL_DECLINED`/`CALL_ENDED` → dispatch `callStore`
- `ChatArea.tsx` thêm `<CallButton>` ở header bên cạnh tên conversation
- `App.tsx` mount `<IncomingCallModal>` global (hiện bất cứ trang nào)
- Khi `callStore.active` set → overlay `<CallScreen>` cover toàn màn hình
- Message list render `<CallEventBubble>` cho message type `call_event`

### 4.4 UI/UX

- Incoming call: full-screen modal, avatar lớn, 2 button tròn Accept/Decline, ringtone
- In-call: video grid của @livekit/components-react, controls bar dưới đáy (mute, camera, hang up)
- Picture-in-picture mode khi minimize (sau MVP)

### 4.5 Effort: **5-6 ngày**

---

## 5. Flutter — Phase 1

### 5.1 Dependencies

```yaml
livekit_client: ^2.7.0
permission_handler: ^11.3.0
wakelock_plus: ^1.2.5           # giữ màn hình sáng khi call
```

### 5.2 Files mới

```
lib/
├── network/call_api_client.dart      # Retrofit cho /calls/*
├── services/call_service.dart
├── models/call.dart                  # Call entity + DTOs
├── providers/
│   ├── call_provider.dart            # State: incoming/active/history
│   └── livekit_room_provider.dart    # Wraps Room object lifecycle
├── screens/call/
│   ├── incoming_call_screen.dart     # Full-screen ringing UI
│   ├── call_screen.dart              # In-call: local + remote video
│   └── call_history_screen.dart
├── widgets/
│   ├── call_button.dart              # Vào ChatAppBar
│   └── call_controls.dart            # Mute/camera/hang-up
└── utils/call_navigator.dart         # Global push incoming call route
```

### 5.3 Integration

- `socket_service.dart` thêm 4 stream cho call events + typed payloads (theo pattern WsEvents có sẵn)
- `socket_listener_provider.dart` listen → dispatch `callProvider`
- `ChatAppBar` thêm 2 nút audio + video call (chỉ hiện cho direct conversation)
- `main.dart` global listener: khi `callProvider.incoming != null` → push `IncomingCallScreen` route

### 5.4 Platform setup

| Platform | Cần làm | Effort |
|---|---|---|
| **iOS** | Info.plist: NSCameraUsageDescription, NSMicrophoneUsageDescription. Min iOS 13 | 🟢 Low |
| **Android** | AndroidManifest: RECORD_AUDIO, CAMERA, FOREGROUND_SERVICE permissions. minSdk 24+ | 🟢 Low |
| **macOS** | entitlements.plist: com.apple.security.device.audio-input, com.apple.security.device.camera | 🟢 Low |

**Skip phase 1**: Windows/Linux desktop call (build verify only, không test runtime).

### 5.5 Effort: **8-10 ngày**

---

## 6. Deploy & Test — Phase 1

### 6.1 docker-compose.yml thêm

```yaml
livekit:
  image: livekit/livekit-server:latest
  command: --config /etc/livekit.yaml
  network_mode: host         # Cần host network cho ICE
  volumes:
    - ./infra/livekit/livekit.yaml:/etc/livekit.yaml
    - ./infra/livekit/tls:/etc/livekit/tls
  depends_on:
    - redis
  restart: unless-stopped
```

### 6.2 Cloudflared config

Thêm route trong tunnel config:
```yaml
- hostname: livekit.ola-server.click
  service: http://localhost:7880
```

### 6.3 Test plan

| # | Test | Platform | Expected |
|---|---|---|---|
| 1 | 1-1 audio call 2 browser tab | Web | Connect, 2-way audio, hang up |
| 2 | 1-1 audio call Web ↔ iOS | Web + iOS | Audio cả 2 chiều |
| 3 | 1-1 video call Web ↔ iOS | | Video + audio |
| 4 | 1-1 call qua 4G (TCP-only) | iOS | Quality check |
| 5 | Decline call | | Status correct |
| 6 | Missed call (không answer 30s) | | Status=missed, message hiển thị |
| 7 | Hang up giữa chừng | | Duration đúng |
| 8 | Call history trong conv | | Hiện đầy đủ |
| 9 | Mất mạng giữa call | | Reconnect hoặc end gracefully |
| 10 | Bandwidth check group 3 người | | < 5 Mbps egress |

### 6.4 Effort: **3-5 ngày**

---

## 7. Phase 2 (sau MVP)

| Feature | Effort | Lý do để sau |
|---|---|---|
| Group call (3-10 người) | 3-4 ngày | Backend đã support, chỉ cần test + UI |
| Screen share | 2 ngày | LiveKit SDK support sẵn |
| iOS PushKit + CallKit | 5-7 ngày | Cần Apple Push cert + cấu hình phức tạp |
| Android FCM high-priority + foreground service | 3-4 ngày | Cần FCM setup |
| Web Push (Service Worker) | 2-3 ngày | |
| Recording (egress) | 4-5 ngày | Cần Chrome headless container |
| Picture-in-picture web | 1-2 ngày | |
| Call quality stats dashboard | 2-3 ngày | LiveKit metrics → Grafana |

---

## 8. Tổng effort & timeline

| Phase | Effort | Cumulative |
|---|---|---|
| 1. Backend | 6-8 ngày | 8 ngày |
| 2. Web | 5-6 ngày | song song với BE |
| 3. Flutter | 8-10 ngày | song song |
| 4. Deploy + test | 3-5 ngày | +5 |
| **MVP total** | **~4 tuần** (song song) | |
| 5. Phase 2 features | 15-20 ngày | +1 tháng |

---

## 9. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| TCP-only quality kém cho video | 🔴 High | Test sớm với 4G. Nếu không OK, mua Cloudflare Spectrum hoặc tách external coturn UDP |
| Cloudflared không pass TLS pass-through cho TURN | 🔴 High | Bypass cloudflared cho port 5349, hit Vultr direct |
| TLS cert cho TURN domain | 🟡 Medium | Let's Encrypt với DNS-01 challenge |
| Vultr bandwidth limit | 🟡 Medium | Monitor, nâng plan nếu cần |
| iOS background incoming call | 🟡 Medium | Phase 2 PushKit, phase 1 skip |
| LiveKit webhook không hit được API qua cloudflared | 🟢 Low | Cloudflared pass HTTP OK |
| Flutter `livekit_client` macOS bug | 🟢 Low | Test sớm, fallback in-app modal |

---

## 10. Câu hỏi cần confirm trước khi code

- [ ] **Network**: OK mở port 7881/tcp + 5349/tcp trên Vultr firewall, bypass cloudflared cho 2 port này?
- [ ] **Push notification**: Phase 1 skip (chỉ ring khi app online)?
- [ ] **Recording**: Skip phase 1?
- [ ] **Screen share**: Phase 1 hay phase 2?
- [ ] **Platforms phase 1**: Web + iOS + Android + macOS, skip Windows/Linux?
- [ ] **TLS cert TURN**: Bạn quản lý DNS `livekit.ola-server.click`? Có thể issue Let's Encrypt qua DNS-01?

---

## 11. Tham khảo

- [LiveKit GitHub](https://github.com/livekit/livekit)
- [LiveKit SFU docs](https://docs.livekit.io/reference/internals/livekit-sfu/)
- [Ports & firewall](https://docs.livekit.io/transport/self-hosting/ports-firewall/)
- [Self-hosting guide](https://docs.livekit.io/transport/self-hosting/deployment/)
- [Token generation](https://docs.livekit.io/home/server/generating-tokens/)
- [Go SDK](https://github.com/livekit/server-sdk-go)
- [JS SDK npm](https://www.npmjs.com/package/livekit-client)
- [React components npm](https://www.npmjs.com/package/@livekit/components-react)
- [Flutter SDK pub.dev](https://pub.dev/packages/livekit_client)
