'use strict'
const { ok, section, req, data, sleep, summary, createUserSet, is2xx } = require('../helpers')

// NOTE: unread counter via ScyllaDB COUNTER is a new feature — behavior noted inline.

async function main() {
  section('09 · UNREAD COUNT & HIDE')

  const users = await createUserSet(2, 'ur')
  const [alice, bob] = users

  // Create direct conv
  let r = await req('POST', '/conversations/direct', { recipientId: bob.id }, alice.token)
  const convId = data(r)?.id

  // Initial: conv is in bob's list
  r = await req('GET', '/conversations', undefined, bob.token)
  const initConv = data(r)?.conversations?.find(c => c.id === convId)
  ok('conv in bob list after creation', !!initConv)
  ok('unreadCount field exists', typeof initConv?.unreadCount === 'number')

  // Alice sends 3 messages
  for (let i = 0; i < 3; i++) {
    await req('POST', '/messages', {
      conversationId: convId, type: 'text', content: `msg ${i + 1}`,
    }, alice.token)
    await sleep(100)
  }
  await sleep(500)

  // Mark as read clears unread
  r = await req('PUT', `/conversations/${convId}/read`, {}, bob.token)
  ok('mark read → 200', r.status === 200)

  r = await req('GET', '/conversations', undefined, bob.token)
  const afterRead = data(r)?.conversations?.find(c => c.id === convId)
  ok('unread = 0 after read', (afterRead?.unreadCount ?? 0) === 0)

  // ── Hide conversation ─────────────────────────────────────────────────────
  r = await req('POST', `/conversations/${convId}/hide`, {}, bob.token)
  ok('hide → 2xx', is2xx(r.status))

  r = await req('GET', '/conversations', undefined, bob.token)
  const hiddenConvs = data(r)?.conversations ?? []
  ok('hidden conv not in list', !hiddenConvs.some(c => c.id === convId))

  // ── Unhide by new message triggers re-appearance ──────────────────────────
  await req('POST', '/messages', {
    conversationId: convId, type: 'text', content: 'unhide trigger',
  }, alice.token)
  await sleep(500)

  r = await req('GET', '/conversations', undefined, bob.token)
  const afterUnhide = data(r)?.conversations ?? []
  ok('conv reappears after new msg', afterUnhide.some(c => c.id === convId))

  // ── Explicit unhide ───────────────────────────────────────────────────────
  await req('POST', `/conversations/${convId}/hide`, {}, bob.token)
  await sleep(100)

  r = await req('POST', `/conversations/${convId}/unhide`, {}, bob.token)
  ok('explicit unhide → 2xx', is2xx(r.status))

  r = await req('GET', '/conversations', undefined, bob.token)
  ok('conv back after explicit unhide', (data(r)?.conversations ?? []).some(c => c.id === convId))

  // ── No auth → 401 ─────────────────────────────────────────────────────────
  r = await req('PUT', `/conversations/${convId}/read`)
  ok('mark read no auth → 401', r.status === 401)

  r = await req('POST', `/conversations/${convId}/hide`)
  ok('hide no auth → 401', r.status === 401)

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
