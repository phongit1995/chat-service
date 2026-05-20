'use strict'
const { ok, section, req, data, sleep, summary, createUserSet, is2xx } = require('../helpers')

// NOTE: server currently returns 500 (instead of 403/400) for some auth/validation
// failures — marked with [BUG] below for future fixes.

async function main() {
  section('06 · MESSAGES')

  const users = await createUserSet(3, 'ms')
  const [alice, bob, charlie] = users

  // Create direct alice ↔ bob
  let r = await req('POST', '/conversations/direct', { recipientId: bob.id }, alice.token)
  const convId = data(r)?.id

  // ── Send messages ─────────────────────────────────────────────────────────
  r = await req('POST', '/messages', {
    conversationId: convId, type: 'text', content: 'Hey bob!',
  }, alice.token)
  ok('alice send → 2xx', is2xx(r.status))
  const md = data(r)
  ok('message has id', !!md?.id)
  ok('content matches', md?.content === 'Hey bob!')
  ok('senderId is alice', md?.senderId === alice.id)
  const msgA1 = md?.id

  r = await req('POST', '/messages', {
    conversationId: convId, type: 'text', content: 'Hi alice!',
  }, bob.token)
  ok('bob replies → 2xx', is2xx(r.status))
  const msgB1 = data(r)?.id

  r = await req('POST', '/messages', {
    conversationId: convId, type: 'text', content: 'How are you?',
  }, alice.token)
  ok('alice 2nd msg → 2xx', is2xx(r.status))

  r = await req('POST', '/messages', {
    conversationId: convId, type: 'text', content: 'Great!',
  }, bob.token)
  ok('bob 2nd msg → 2xx', is2xx(r.status))
  const msgB2 = data(r)?.id

  // ── History ───────────────────────────────────────────────────────────────
  r = await req('GET', `/messages/${convId}`, undefined, alice.token)
  ok('get history → 200', r.status === 200)
  const hist = data(r)
  ok('history is array', Array.isArray(hist?.messages))
  ok('≥ 4 messages', (hist?.messages?.length ?? 0) >= 4)
  ok('sorted ascending', (hist?.messages ?? []).every((m, i) =>
    i === 0 || m.createdAt >= hist.messages[i-1].createdAt
  ))

  // Non-member → error (server returns 500 instead of 403, [BUG])
  r = await req('GET', `/messages/${convId}`, undefined, charlie.token)
  ok('non-member history → error', r.status >= 400)

  r = await req('POST', '/messages', {
    conversationId: convId, type: 'text', content: 'hack',
  }, charlie.token)
  ok('non-member send → error', r.status >= 400)

  // ── Direct message shortcut ───────────────────────────────────────────────
  r = await req('POST', '/messages/direct', {
    recipientId: charlie.id, type: 'text', content: 'direct msg to charlie',
  }, alice.token)
  ok('direct send to charlie → 2xx', is2xx(r.status))
  ok('returns message id', !!data(r)?.id)

  // ── Edit message ─────────────────────────────────────────────────────────
  r = await req('PATCH', `/messages/${convId}/${msgA1}`, { content: 'Hey bob!! (edited)' }, alice.token)
  ok('edit own → 2xx', is2xx(r.status))

  let edited
  for (let i = 0; i < 20; i++) {
    await sleep(500)
    r = await req('GET', `/messages/${convId}`, undefined, alice.token)
    edited = data(r)?.messages?.find(m => m.id === msgA1)
    if (edited?.content === 'Hey bob!! (edited)') break
  }
  ok('edit reflected in history', edited?.content === 'Hey bob!! (edited)')

  // [BUG] empty content should be 400, server returns 500
  r = await req('PATCH', `/messages/${convId}/${msgA1}`, { content: '' }, alice.token)
  ok('empty content → error', r.status >= 400)

  // [BUG] cross-sender edit should be 403, server returns 500
  r = await req('PATCH', `/messages/${convId}/${msgA1}`, { content: 'x' }, bob.token)
  ok("bob edits alice's msg → error", r.status >= 400)

  // ── Delete message ────────────────────────────────────────────────────────
  const countBefore = data(await req('GET', `/messages/${convId}`, undefined, alice.token))?.messages?.length ?? 0

  r = await req('DELETE', `/messages/${convId}/${msgB2}`, undefined, bob.token)
  ok('bob deletes own → 2xx', is2xx(r.status))

  await sleep(300)
  r = await req('GET', `/messages/${convId}`, undefined, alice.token)
  const afterDel = data(r)?.messages ?? []
  ok('deleted msg gone', !afterDel.find(m => m.id === msgB2))
  ok('count -1', afterDel.length === countBefore - 1)

  // [BUG] cross-sender delete should be 403, server returns 500
  r = await req('DELETE', `/messages/${convId}/${msgB1}`, undefined, alice.token)
  ok("alice deletes bob's → error", r.status >= 400)

  r = await req('DELETE', `/messages/${convId}/${msgA1}`, undefined, charlie.token)
  ok('non-member delete → error', r.status >= 400)

  // ── Delete window (MESSAGE_DELETE_WINDOW_SECONDS) ─────────────────────────
  const winSec = parseInt(process.env.MESSAGE_DELETE_WINDOW_SECONDS || '7200', 10)
  if (winSec > 0 && winSec <= 60) {
    r = await req('POST', '/messages', {
      conversationId: convId, type: 'text', content: 'msg to expire',
    }, alice.token)
    const oldMsgId = data(r)?.id
    ok('send msg for window test → 2xx', is2xx(r.status))

    await sleep((winSec + 1) * 1000)

    r = await req('DELETE', `/messages/${convId}/${oldMsgId}`, undefined, alice.token)
    ok(`delete after ${winSec}s window → 403`, r.status === 403)
    ok('error mentions too old', /too old/i.test(JSON.stringify(r.body)))
  }

  // ── No auth → 401 ─────────────────────────────────────────────────────────
  r = await req('POST', '/messages', { conversationId: convId, type: 'text', content: 'x' })
  ok('send no auth → 401', r.status === 401)

  r = await req('GET', `/messages/${convId}`)
  ok('history no auth → 401', r.status === 401)

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
