'use strict'
const { ok, section, req, data, sleep, summary, createUserSet, is2xx, WS_BASE } = require('../helpers')
const { io } = require('socket.io-client')
const crypto = require('crypto')

const BASE = process.env.API_BASE || 'http://localhost:8080/api'
// Must match LIVEKIT_API_KEY/SECRET in .env
const LK_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey'
const LK_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecretatleast32characterslongforlocaldev'
// CALL_RING_TIMEOUT_SECONDS must be 3 in .env for the timeout test
const RING_TIMEOUT = parseInt(process.env.CALL_RING_TIMEOUT_SECONDS || '3', 10)

function decodeJwtPayload(jwt) {
  try {
    const part = jwt.split('.')[1]
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

function base64url(buf) {
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

// Mint a LiveKit-style webhook JWT (HS256, body sha256 in claims).
function signLiveKitWebhook(body) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const sha = crypto.createHash('sha256').update(body).digest('base64')
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: LK_API_KEY,
    nbf: now - 5,
    exp: now + 3600,
    sha256: sha,
    video: {},
  }
  const h = base64url(Buffer.from(JSON.stringify(header)))
  const p = base64url(Buffer.from(JSON.stringify(payload)))
  const data = `${h}.${p}`
  const sig = crypto.createHmac('sha256', LK_API_SECRET).update(data).digest()
  return `${data}.${base64url(sig)}`
}

function waitForWsEvent(socket, eventType, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${eventType}`)), timeoutMs)
    const onMessage = (msg) => {
      if (msg && msg.type === eventType) {
        clearTimeout(t)
        socket.off('message', onMessage)
        resolve(msg.data)
      }
    }
    socket.on('message', onMessage)
  })
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const s = io(WS_BASE, {
      transports: ['websocket'],
      auth: { token },
      reconnection: false,
      timeout: 5000,
    })
    s.on('connect', () => resolve(s))
    s.on('connect_error', reject)
    setTimeout(() => reject(new Error('socket connect timeout')), 5000)
  })
}

async function main() {
  section('13 · CALLS (LiveKit + Kafka)')

  // Allow Kafka consumer group in chat service to be assigned partitions before
  // we start producing call events; otherwise the first INCOMING_CALL may be
  // missed because the consumer is still rebalancing.
  await sleep(500)

  const [alice, bob, charlie] = await createUserSet(3, 'cl')

  // Direct conversation alice ↔ bob
  let r = await req('POST', '/conversations/direct', { recipientId: bob.id }, alice.token)
  ok('create direct conv → 2xx', is2xx(r.status))
  const convAB = data(r)?.id
  ok('conv has id', !!convAB)

  // Connect bob & alice to WS for event verification
  const bobSocket = await connectSocket(bob.token)
  const aliceSocket = await connectSocket(alice.token)

  // ── 1. Start call (audio) — verify INCOMING_CALL pushed to bob ──────────
  const incomingPromise = waitForWsEvent(bobSocket, 'INCOMING_CALL')

  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'audio' }, alice.token)
  ok('alice starts audio call → 2xx', is2xx(r.status))
  const callA = data(r)
  ok('response has callId', !!callA?.callId)
  ok('response has roomName', !!callA?.roomName)
  ok('response has JWT', typeof callA?.token === 'string' && callA.token.split('.').length === 3)
  ok('response has wsUrl', !!callA?.wsUrl)
  ok('status=ringing', callA?.status === 'ringing')
  ok('callType=audio', callA?.callType === 'audio')

  const claims = decodeJwtPayload(callA?.token || '')
  ok('JWT identity = alice', claims?.sub === alice.id || claims?.identity === alice.id)
  ok('JWT video.room = roomName', claims?.video?.room === callA.roomName)
  ok('JWT roomJoin = true', claims?.video?.roomJoin === true)

  const incoming = await incomingPromise.catch(e => { console.error(e); return null })
  ok('bob WS got INCOMING_CALL', !!incoming)
  ok('INCOMING_CALL has callId', incoming?.callId === callA.callId)
  ok('INCOMING_CALL has callerId=alice', incoming?.callerId === alice.id)
  ok('INCOMING_CALL has callType=audio', incoming?.callType === 'audio')
  ok('INCOMING_CALL has roomName', incoming?.roomName === callA.roomName)

  const callId = callA.callId
  const roomName = callA.roomName

  // ── 2. Validation ────────────────────────────────────────────────────────
  r = await req('POST', '/calls/start', { conversationId: convAB }, alice.token)
  ok('missing callType → 400', r.status === 400)
  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'sticker' }, alice.token)
  ok('invalid callType → 400', r.status === 400)
  r = await req('POST', '/calls/start', { conversationId: 'not-uuid', callType: 'audio' }, alice.token)
  ok('bad conv uuid → 400', r.status === 400)
  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'audio' }, charlie.token)
  ok('non-member start → 403', r.status === 403)
  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'audio' }, null)
  ok('no token → 401', r.status === 401)

  // ── 3. Answer — verify CALL_ACCEPTED pushed to alice ────────────────────
  r = await req('POST', `/calls/${callId}/answer`, undefined, alice.token)
  ok('caller answer own call → 403', r.status === 403)
  r = await req('POST', `/calls/${callId}/answer`, undefined, charlie.token)
  ok('non-member answer → 403', r.status === 403)

  const acceptedPromise = waitForWsEvent(aliceSocket, 'CALL_ACCEPTED')
  r = await req('POST', `/calls/${callId}/answer`, undefined, bob.token)
  ok('bob answers → 2xx', is2xx(r.status))
  ok('answer has token', typeof data(r)?.token === 'string')
  ok('same roomName', data(r)?.roomName === roomName)
  ok('status=active', data(r)?.status === 'active')

  const bobClaims = decodeJwtPayload(data(r)?.token || '')
  ok('bob JWT identity = bob', bobClaims?.sub === bob.id || bobClaims?.identity === bob.id)
  ok('bob JWT room = same room', bobClaims?.video?.room === roomName)

  const accepted = await acceptedPromise.catch(() => null)
  ok('alice WS got CALL_ACCEPTED', !!accepted)
  ok('CALL_ACCEPTED has answeredBy=bob', accepted?.answeredBy === bob.id)

  r = await req('POST', `/calls/${callId}/answer`, undefined, bob.token)
  ok('answer again → 409', r.status === 409)

  // ── 4. End — verify CALL_ENDED pushed to both ───────────────────────────
  r = await req('POST', `/calls/${callId}/end`, undefined, charlie.token)
  ok('non-member end → 403', r.status === 403)

  const endedAlicePromise = waitForWsEvent(aliceSocket, 'CALL_ENDED')
  const endedBobPromise = waitForWsEvent(bobSocket, 'CALL_ENDED')
  r = await req('POST', `/calls/${callId}/end`, undefined, bob.token)
  ok('bob ends call → 2xx', is2xx(r.status))

  const endedA = await endedAlicePromise.catch(() => null)
  const endedB = await endedBobPromise.catch(() => null)
  ok('alice WS got CALL_ENDED', !!endedA)
  ok('bob WS got CALL_ENDED', !!endedB)
  ok('CALL_ENDED status=ended', endedA?.status === 'ended')
  ok('CALL_ENDED has duration', typeof endedA?.durationSeconds === 'number')

  r = await req('POST', `/calls/${callId}/end`, undefined, bob.token)
  ok('end again idempotent → 2xx', is2xx(r.status))
  r = await req('POST', `/calls/${callId}/answer`, undefined, bob.token)
  ok('answer ended call → 409', r.status === 409)

  // ── 5. Decline — verify CALL_DECLINED pushed to caller ──────────────────
  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'video' }, alice.token)
  ok('alice starts video call → 2xx', is2xx(r.status))
  const call2 = data(r)
  ok('callType=video', call2?.callType === 'video')

  r = await req('POST', `/calls/${call2.callId}/decline`, undefined, charlie.token)
  ok('non-member decline → 403', r.status === 403)
  r = await req('POST', `/calls/${call2.callId}/decline`, undefined, alice.token)
  ok('caller cannot decline own → 403', r.status === 403)

  const declinedPromise = waitForWsEvent(aliceSocket, 'CALL_DECLINED')
  r = await req('POST', `/calls/${call2.callId}/decline`, undefined, bob.token)
  ok('bob declines → 2xx', is2xx(r.status))
  const declined = await declinedPromise.catch(() => null)
  ok('alice WS got CALL_DECLINED', !!declined)
  ok('CALL_DECLINED has declinedBy=bob', declined?.declinedBy === bob.id)

  r = await req('POST', `/calls/${call2.callId}/answer`, undefined, bob.token)
  ok('answer declined call → 409', r.status === 409)

  // ── 6. Auto-timeout (CALL_RING_TIMEOUT_SECONDS) ─────────────────────────
  console.log(`  ⏱  Testing ring timeout (${RING_TIMEOUT}s)...`)
  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'audio' }, alice.token)
  ok('alice starts call to timeout → 2xx', is2xx(r.status))
  const call3 = data(r)

  const timeoutEndedPromise = waitForWsEvent(aliceSocket, 'CALL_ENDED', (RING_TIMEOUT + 5) * 1000)
  const timeoutEnded = await timeoutEndedPromise.catch(() => null)
  ok(`timeout fires CALL_ENDED within ${RING_TIMEOUT + 5}s`, !!timeoutEnded)
  ok('timeout CALL_ENDED status=missed', timeoutEnded?.status === 'missed')

  r = await req('POST', `/calls/${call3.callId}/answer`, undefined, bob.token)
  ok('answer timed-out call → 409', r.status === 409)

  // ── 7. LiveKit webhook — room_finished ───────────────────────────────────
  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'audio' }, alice.token)
  ok('alice starts call for webhook → 2xx', is2xx(r.status))
  const call4 = data(r)
  await req('POST', `/calls/${call4.callId}/answer`, undefined, bob.token)

  // Drain prior events so we wait fresh
  await sleep(150)

  const webhookEndedPromise = waitForWsEvent(aliceSocket, 'CALL_ENDED')
  const wbody = JSON.stringify({ event: 'room_finished', room: { name: call4.roomName } })
  const sigJwt = signLiveKitWebhook(wbody)
  const wres = await fetch(`${BASE}/calls/webhook`, {
    method: 'POST',
    headers: { 'Authorization': sigJwt, 'Content-Type': 'application/webhook+json' },
    body: wbody,
  })
  ok('webhook with valid signature → 2xx', is2xx(wres.status))

  const wbEnded = await webhookEndedPromise.catch(() => null)
  ok('webhook finalizes call → CALL_ENDED', !!wbEnded)
  ok('webhook ended status=ended', wbEnded?.status === 'ended')

  // Invalid signature
  const wresBad = await fetch(`${BASE}/calls/webhook`, {
    method: 'POST',
    headers: { 'Authorization': 'invalid.jwt.value', 'Content-Type': 'application/webhook+json' },
    body: wbody,
  })
  ok('webhook with bad signature → 401', wresBad.status === 401)

  // No header
  const wresNoHeader = await fetch(`${BASE}/calls/webhook`, {
    method: 'POST',
    body: wbody,
  })
  ok('webhook without auth → 401', wresNoHeader.status === 401)

  // ── 8. Not found ─────────────────────────────────────────────────────────
  const fakeId = '00000000-0000-0000-0000-000000000000'
  r = await req('POST', `/calls/${fakeId}/answer`, undefined, bob.token)
  ok('answer non-existent → 404', r.status === 404)
  r = await req('POST', `/calls/${fakeId}/end`, undefined, bob.token)
  ok('end non-existent → 404', r.status === 404)

  bobSocket.close()
  aliceSocket.close()

  return summary()
}

main().then(s => process.exit(s.failed === 0 ? 0 : 1))
  .catch(err => { console.error(err); process.exit(1) })
