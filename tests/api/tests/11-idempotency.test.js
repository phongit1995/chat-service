'use strict'
const { ok, section, req, data, summary, createUserSet, is2xx } = require('../helpers')
const crypto = require('crypto')

async function main() {
  section('11 · MESSAGE IDEMPOTENCY (clientMsgId)')

  const [alice, bob] = await createUserSet(2, 'idm')

  let r = await req('POST', '/conversations/direct', { recipientId: bob.id }, alice.token)
  const convId = data(r)?.id
  ok('direct conv created', !!convId)

  const clientMsgId = crypto.randomUUID()
  const body = { conversationId: convId, type: 'text', content: 'idempotent hello', clientMsgId }

  // First send
  r = await req('POST', '/messages', body, alice.token)
  ok('first send → 2xx', is2xx(r.status))
  const first = data(r)
  ok('response includes id', !!first?.id)
  ok('response echoes clientMsgId', first?.clientMsgId === clientMsgId)

  // Retry with same clientMsgId — should NOT create a new message
  r = await req('POST', '/messages', body, alice.token)
  ok('retry → 2xx', is2xx(r.status))
  const second = data(r)
  ok('retry returns same message id', second?.id === first?.id)
  ok('retry returns same clientMsgId', second?.clientMsgId === clientMsgId)

  // Different clientMsgId, same content → must create a new message
  const otherClientMsgId = crypto.randomUUID()
  r = await req('POST', '/messages', { ...body, clientMsgId: otherClientMsgId }, alice.token)
  ok('different clientMsgId → 2xx', is2xx(r.status))
  const third = data(r)
  ok('different clientMsgId creates new message', third?.id && third.id !== first.id)

  // Without clientMsgId at all — must always create a new message
  r = await req('POST', '/messages',
    { conversationId: convId, type: 'text', content: 'no dedup' }, alice.token)
  ok('no clientMsgId → 2xx', is2xx(r.status))
  const fourth = data(r)
  ok('no clientMsgId creates new message', fourth?.id && fourth.id !== third.id)

  // Different sender, same clientMsgId — must NOT collide (key includes sender)
  r = await req('POST', '/messages', body, bob.token)
  ok('bob using alice clientMsgId → 2xx', is2xx(r.status))
  const fifth = data(r)
  ok('different sender same clientMsgId creates new message', fifth?.id && fifth.id !== first.id)

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
