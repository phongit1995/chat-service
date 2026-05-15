# LiveKit Setup Guide

## Local Development

LiveKit dev container đã chạy sẵn:
```bash
docker compose -f docker-compose.dev.yml up -d livekit
```

- URL: `ws://localhost:7880`
- API Key: `devkey`
- API Secret: `devsecretatleast32characterslongforlocaldev`
- Mode: Local (chỉ test trong cùng máy)

## Production Deployment

### Bước 1: Generate strong API secret

Trên máy local:
```bash
openssl rand -hex 32
```

Copy giá trị vào `env.production`:
```env
LIVEKIT_API_SECRET=<paste-here>
```

### Bước 2: Add Cloudflare Tunnel route

Cloudflare Tunnel route trỏ **trực tiếp** đến LiveKit container (không qua nginx).

#### Option A: Cloudflare Dashboard (recommend)

1. Mở `https://one.dash.cloudflare.com/` → Zero Trust → Networks → Tunnels
2. Chọn tunnel đang dùng (`4e0ffead-29de-4494-94e1-19ea2406f4ed`)
3. Tab **Public Hostnames** → **Add a public hostname**
4. Điền:
   - **Subdomain**: `livekit`
   - **Domain**: `ola-server.click`
   - **Path**: (để trống)
   - **Type**: `HTTP`
   - **URL**: `chat-server-livekit:7880`
5. **Additional application settings**:
   - **TLS** → No TLS Verify: ON (LiveKit chạy plain HTTP nội bộ)
   - **HTTP** → HTTP Host Header: `livekit.ola-server.click`
6. Save

#### Option B: DockFlare UI

1. Mở DockFlare UI (port 5000 của container `dockflare`)
2. Add route:
   - Hostname: `livekit.ola-server.click`
   - Service: `http://chat-server-livekit:7880`
3. Save → DockFlare sync với Cloudflare

### Bước 3: Deploy LiveKit

Trên VPS:
```bash
cd /root/chat-service
git pull
docker compose pull livekit
docker compose up -d livekit
```

Verify:
```bash
docker ps | grep livekit
docker logs chat-server-livekit
```

Expect:
```
INFO	livekit	starting LiveKit server	...
```

### Bước 4: Test

```bash
curl -I https://livekit.ola-server.click/
```

Expect: `HTTP/2 200`.

Verify từ container khác trong network:
```bash
docker exec chat-server-api wget -O- http://chat-server-livekit:7880/ 2>&1 | head -3
```

## Network Architecture

```
Client (browser/mobile)
   │
   │ wss://livekit.ola-server.click
   ▼
Cloudflare Edge → Cloudflare Tunnel (cloudflared)
   │
   │ HTTP → chat-server-livekit:7880  (cùng network chat-service_chat-network)
   ▼
LiveKit container
```

**Tại sao không qua nginx?**
- LiveKit chỉ cần subdomain riêng (`livekit.ola-server.click`), không share path với service khác
- Bớt 1 hop → latency thấp hơn
- Container `livekit` standalone, restart không ảnh hưởng nginx/api/chat
- Cloudflared đã có sẵn trong network `chat-service_chat-network` → access trực tiếp được

## Mode hiện tại: TCP-only

- Cloudflare Tunnel **không hỗ trợ UDP** → media traffic chạy qua **TCP port 7881** (LiveKit fallback)
- Client cần config `iceTransportPolicy: 'relay'` để force TCP
- ✅ Audio call: ổn
- ⚠️ Video call: có thể giật khi mạng yếu (TCP head-of-line blocking)

## Upgrade lên UDP (production quality)

Khi cần video call mượt:

1. Tạo subdomain DNS-only (grey cloud): `livekit-rtc.ola-server.click` → A record trỏ trực tiếp IP VPS `149.28.138.222`
2. Mở firewall VPS:
   ```bash
   ufw allow 7881/tcp
   ufw allow 7882/udp
   ```
3. Đổi config `livekit.prod.yaml`:
   ```yaml
   rtc:
     udp_port: 7882
     tcp_port: 7881
     use_external_ip: true
     node_ip: 149.28.138.222
   ```
4. Client bỏ `iceTransportPolicy: 'relay'` → ICE tự chọn UDP

Signaling vẫn qua Cloudflare Tunnel (`wss://livekit.ola-server.click`), media bypass đi direct → vẫn an toàn, vẫn nhanh.

## Troubleshooting

### LiveKit không chạy:
```bash
docker logs chat-server-livekit
```

### Cloudflare 502 Bad Gateway:
- Verify cloudflared cùng network với livekit:
  ```bash
  docker inspect cloudflared-agent-dockflare-tunnel --format '{{json .NetworkSettings.Networks}}' | grep chat-network
  docker inspect chat-server-livekit --format '{{json .NetworkSettings.Networks}}' | grep chat-network
  ```
- Verify resolve được hostname:
  ```bash
  docker exec cloudflared-agent-dockflare-tunnel nslookup chat-server-livekit
  ```

### "UDP receive buffer is too small":
Warning có thể bỏ qua nếu TCP-only mode. Nếu muốn fix khi sau này dùng UDP:
```bash
sudo sysctl -w net.core.rmem_max=5000000
sudo sysctl -w net.core.wmem_max=5000000
```
