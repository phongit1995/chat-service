'use strict'
const { ok, section, req, data, sleep, summary, createUserSet, is2xx } = require('../helpers')
const { Kafka, CompressionTypes, CompressionCodecs } = require('kafkajs')
const lz4js = require('lz4js')
CompressionCodecs[CompressionTypes.LZ4] = () => ({
  compress: async ({ buffer }) => Buffer.from(lz4js.compress(buffer)),
  decompress: async (buffer) => Buffer.from(lz4js.decompress(buffer)),
})

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')

const TOPICS = {
  INVITED:  'CHAT.CALL.INVITED',
  ACCEPTED: 'CHAT.CALL.ACCEPTED',
  DECLINED: 'CHAT.CALL.DECLINED',
  ENDED:    'CHAT.CALL.ENDED',
}

const RING_TIMEOUT = parseInt(process.env.CALL_RING_TIMEOUT_SECONDS || '3', 10)

async function startConsumer(inbox) {
  const kafka = new Kafka({
    clientId: `test-call-verifier-${Date.now()}`,
    brokers: KAFKA_BROKERS,
    logLevel: 0,
  })
  const consumer = kafka.consumer({
    groupId: `test-call-verifier-${Date.now()}`,
    sessionTimeout: 10000,
  })
  const joined = new Promise((resolve) => {
    consumer.on(consumer.events.GROUP_JOIN, () => resolve())
  })
  await consumer.connect()
  for (const t of Object.values(TOPICS)) {
    await consumer.subscribe({ topic: t, fromBeginning: false })
  }
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      let parsed
      try { parsed = JSON.parse(message.value.toString('utf8')) } catch { return }
      const headers = {}
      for (const [k, v] of Object.entries(message.headers || {})) {
        headers[k] = v ? v.toString('utf8') : ''
      }
      const key = message.key ? message.key.toString('utf8') : null
      const entry = { topic, key, payload: parsed, headers, offset: message.offset }
      for (const [name, t] of Object.entries(TOPICS)) {
        if (t === topic) { inbox[name].push(entry); break }
      }
    },
  })
  await joined
  return consumer
}

async function main() {
  section('14 · CALLS · Kafka topics direct verification')

  const inbox = { INVITED: [], ACCEPTED: [], DECLINED: [], ENDED: [] }
  const consumer = await startConsumer(inbox)

  // Give consumer time to fetch partition metadata & settle on latest offsets.
  // node-rdkafka takes ~3s before its first fetch returns any new messages.
  await sleep(4000)

  async function waitFor(name, predicate, timeoutMs = 5000) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const hit = inbox[name].find(predicate)
      if (hit) return hit
      await sleep(50)
    }
    return null
  }

  const [alice, bob, charlie] = await createUserSet(3, 'kc')

  let r = await req('POST', '/conversations/direct', { recipientId: bob.id }, alice.token)
  ok('create direct conv → 2xx', is2xx(r.status))
  const convAB = data(r)?.id

  // ── 1. INVITED ───────────────────────────────────────────────────────────
  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'audio' }, alice.token)
  ok('alice starts call → 2xx', is2xx(r.status))
  const callA = data(r)

  const invited = await waitFor('INVITED', (e) => e.payload?.callId === callA.callId)
  ok('Kafka INVITED received', !!invited)
  ok('INVITED topic = CHAT.CALL.INVITED', invited?.topic === TOPICS.INVITED)
  ok('INVITED kafka key = callId', invited?.key === callA.callId)
  ok('INVITED has callId', invited?.payload?.callId === callA.callId)
  ok('INVITED has conversationId', invited?.payload?.conversationId === convAB)
  ok('INVITED has callerId=alice', invited?.payload?.callerId === alice.id)
  ok('INVITED has callType=audio', invited?.payload?.callType === 'audio')
  ok('INVITED has roomName', invited?.payload?.roomName === callA.roomName)
  ok('INVITED has recipients[]', Array.isArray(invited?.payload?.recipients))
  ok('INVITED recipients excludes caller', !invited?.payload?.recipients?.includes(alice.id))
  ok('INVITED recipients includes bob', invited?.payload?.recipients?.includes(bob.id))
  ok('INVITED has startedAt (ISO)', !!invited?.payload?.startedAt && !isNaN(Date.parse(invited.payload.startedAt)))
  ok('INVITED has header ts', !!invited?.headers?.ts)

  // ── 2. ACCEPTED ──────────────────────────────────────────────────────────
  r = await req('POST', `/calls/${callA.callId}/answer`, undefined, bob.token)
  ok('bob answers → 2xx', is2xx(r.status))

  const accepted = await waitFor('ACCEPTED', (e) => e.payload?.callId === callA.callId)
  ok('Kafka ACCEPTED received', !!accepted)
  ok('ACCEPTED topic = CHAT.CALL.ACCEPTED', accepted?.topic === TOPICS.ACCEPTED)
  ok('ACCEPTED has callId', accepted?.payload?.callId === callA.callId)
  ok('ACCEPTED has answeredBy=bob', accepted?.payload?.answeredBy === bob.id)
  ok('ACCEPTED has conversationId', accepted?.payload?.conversationId === convAB)
  ok('ACCEPTED recipients includes alice', accepted?.payload?.recipients?.includes(alice.id))
  ok('ACCEPTED recipients excludes bob', !accepted?.payload?.recipients?.includes(bob.id))

  // ── 3. ENDED (normal) ────────────────────────────────────────────────────
  r = await req('POST', `/calls/${callA.callId}/end`, undefined, bob.token)
  ok('bob ends call → 2xx', is2xx(r.status))

  const ended = await waitFor('ENDED', (e) => e.payload?.callId === callA.callId)
  ok('Kafka ENDED received', !!ended)
  ok('ENDED topic = CHAT.CALL.ENDED', ended?.topic === TOPICS.ENDED)
  ok('ENDED status=ended', ended?.payload?.status === 'ended')
  ok('ENDED has endedBy=bob', ended?.payload?.endedBy === bob.id)
  ok('ENDED has durationSeconds', typeof ended?.payload?.durationSeconds === 'number')
  ok('ENDED recipients includes both alice & bob',
    ended?.payload?.recipients?.includes(alice.id) && ended?.payload?.recipients?.includes(bob.id))

  // ── 4. DECLINED ──────────────────────────────────────────────────────────
  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'video' }, alice.token)
  ok('alice starts video call → 2xx', is2xx(r.status))
  const call2 = data(r)

  r = await req('POST', `/calls/${call2.callId}/decline`, undefined, bob.token)
  ok('bob declines → 2xx', is2xx(r.status))

  const declined = await waitFor('DECLINED', (e) => e.payload?.callId === call2.callId)
  ok('Kafka DECLINED received', !!declined)
  ok('DECLINED topic = CHAT.CALL.DECLINED', declined?.topic === TOPICS.DECLINED)
  ok('DECLINED has declinedBy=bob', declined?.payload?.declinedBy === bob.id)
  ok('DECLINED has conversationId', declined?.payload?.conversationId === convAB)
  ok('DECLINED recipients includes alice', declined?.payload?.recipients?.includes(alice.id))

  // ── 5. ENDED (missed via timeout) ────────────────────────────────────────
  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'audio' }, alice.token)
  ok('alice starts call to miss → 2xx', is2xx(r.status))
  const call3 = data(r)

  const missed = await waitFor('ENDED',
    (e) => e.payload?.callId === call3.callId && e.payload?.status === 'missed',
    (RING_TIMEOUT + 5) * 1000)
  ok(`Kafka ENDED (missed) within ${RING_TIMEOUT + 5}s`, !!missed)
  ok('missed has status=missed', missed?.payload?.status === 'missed')

  // ── 6. Charlie (non-member) starts no-op — no Kafka event ──────────────
  const beforeCount = inbox.INVITED.length
  r = await req('POST', '/calls/start', { conversationId: convAB, callType: 'audio' }, charlie.token)
  ok('non-member start rejected → 403', r.status === 403)
  await sleep(500)
  ok('no extra INVITED event emitted', inbox.INVITED.length === beforeCount)

  await consumer.disconnect()
  return summary()
}

main().then(s => process.exit(s.failed === 0 ? 0 : 1))
  .catch(err => { console.error(err); process.exit(1) })
