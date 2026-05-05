'use strict'
const { ok, section, req, data, sleep, summary, createUserSet, is2xx } = require('../helpers')

async function main() {
  section('04 · CONVERSATIONS')

  const users = await createUserSet(4, 'cv')
  const [alice, bob, charlie, dana] = users

  // ── 1. Create direct conversation ────────────────────────────────────────
  let r = await req('POST', '/conversations/direct', { recipientId: bob.id }, alice.token)
  ok('alice ↔ bob direct → 2xx', is2xx(r.status))
  const dd = data(r)
  ok('direct has id', !!dd?.id)
  ok('type=direct', dd?.type === 'direct')
  const directAB = dd?.id

  // Idempotent: creating same direct conv again returns existing
  r = await req('POST', '/conversations/direct', { recipientId: bob.id }, alice.token)
  ok('direct again → 2xx', is2xx(r.status))
  ok('same id returned', data(r)?.id === directAB)

  // ── 2. Create group conversation ─────────────────────────────────────────
  r = await req('POST', '/conversations/group', {
    name: 'Alpha Team',
    participantIds: [bob.id, charlie.id],
  }, alice.token)
  ok('create Alpha Team group → 2xx', is2xx(r.status))
  const gd = data(r)
  ok('group has name', gd?.name === 'Alpha Team')
  ok('type=group', gd?.type === 'group')
  const groupAlpha = gd?.id

  r = await req('POST', '/conversations/group', {
    name: 'Beta Squad',
    participantIds: [alice.id, charlie.id],
  }, dana.token)
  ok('dana creates Beta Squad → 2xx', is2xx(r.status))
  const groupBeta = data(r)?.id

  // ── 3. List conversations per user ───────────────────────────────────────
  r = await req('GET', '/conversations', undefined, alice.token)
  ok('alice list → 200', r.status === 200)
  const aliceConvs = data(r)?.conversations ?? []
  ok('alice sees direct', aliceConvs.some(c => c.id === directAB))
  ok('alice sees Alpha', aliceConvs.some(c => c.id === groupAlpha))
  ok('alice sees Beta', aliceConvs.some(c => c.id === groupBeta))

  r = await req('GET', '/conversations', undefined, bob.token)
  const bobConvs = data(r)?.conversations ?? []
  ok('bob sees direct', bobConvs.some(c => c.id === directAB))
  ok('bob sees Alpha', bobConvs.some(c => c.id === groupAlpha))
  ok('bob NOT in Beta', !bobConvs.some(c => c.id === groupBeta))

  r = await req('GET', '/conversations', undefined, dana.token)
  const danaConvs = data(r)?.conversations ?? []
  ok('dana sees Beta', danaConvs.some(c => c.id === groupBeta))
  ok('dana NOT in Alpha', !danaConvs.some(c => c.id === groupAlpha))
  ok('dana NOT in direct', !danaConvs.some(c => c.id === directAB))

  // ── 4. Ordering by last activity ─────────────────────────────────────────
  await req('POST', '/messages', { conversationId: groupAlpha, type: 'text', content: 'bump Alpha' }, alice.token)
  await sleep(100)
  r = await req('GET', '/conversations', undefined, alice.token)
  ok('Alpha at top after msg', data(r)?.conversations?.[0]?.id === groupAlpha)

  await req('POST', '/messages', { conversationId: groupBeta, type: 'text', content: 'bump Beta' }, alice.token)
  await sleep(100)
  r = await req('GET', '/conversations', undefined, alice.token)
  ok('Beta at top after msg', data(r)?.conversations?.[0]?.id === groupBeta)

  await req('POST', '/messages', { conversationId: directAB, type: 'text', content: 'bump direct' }, bob.token)
  await sleep(100)
  r = await req('GET', '/conversations', undefined, alice.token)
  ok('direct at top after bob msg', data(r)?.conversations?.[0]?.id === directAB)

  // ── 5. Mark as read ──────────────────────────────────────────────────────
  r = await req('PUT', `/conversations/${directAB}/read`, {}, bob.token)
  ok('mark as read → 200', r.status === 200)

  // ── 6. Hide / unhide conversation ────────────────────────────────────────
  r = await req('POST', `/conversations/${groupAlpha}/hide`, {}, charlie.token)
  ok('hide → 2xx', is2xx(r.status))

  r = await req('GET', '/conversations', undefined, charlie.token)
  ok('hidden conv not in list', !(data(r)?.conversations ?? []).some(c => c.id === groupAlpha))

  r = await req('POST', `/conversations/${groupAlpha}/unhide`, {}, charlie.token)
  ok('unhide → 2xx', is2xx(r.status))

  r = await req('GET', '/conversations', undefined, charlie.token)
  ok('conv back after unhide', (data(r)?.conversations ?? []).some(c => c.id === groupAlpha))

  // ── 7. No auth → 401 ─────────────────────────────────────────────────────
  r = await req('GET', '/conversations')
  ok('list no auth → 401', r.status === 401)

  r = await req('POST', '/conversations/direct', { recipientId: bob.id })
  ok('create direct no auth → 401', r.status === 401)

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
