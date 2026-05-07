'use strict'
const { ok, section, req, data, sleep, summary, createUserSet } = require('../helpers')

async function main() {
  section('UNREAD REALISTIC')
  const [a, b] = await createUserSet(2, 'ur')
  let r = await req('POST', '/conversations/direct', { recipientId: b.id }, a.token)
  const cid = data(r).id
  ok('conv', !!cid)

  for (let i = 1; i <= 3; i++) {
    await req('POST', '/messages', { conversationId: cid, type: 'text', content: `msg ${i}` }, a.token)
  }
  await sleep(800)

  r = await req('GET', '/conversations', undefined, b.token)
  const conv = data(r).conversations.find(c => c.id === cid)
  ok('b sees conv', !!conv)
  ok('b unreadCount = 3', conv?.unreadCount === 3)
  ok('b seen = false', conv?.seen === false)

  r = await req('GET', '/conversations', undefined, a.token)
  const convA = data(r).conversations.find(c => c.id === cid)
  ok('a unreadCount = 0', convA?.unreadCount === 0)
  ok('a seen = true (own)', convA?.seen === true)

  await req('PUT', `/conversations/${cid}/read`, {}, b.token)
  await sleep(300)
  r = await req('GET', '/conversations', undefined, b.token)
  const conv2 = data(r).conversations.find(c => c.id === cid)
  ok('after read: unread = 0', conv2?.unreadCount === 0)
  ok('after read: seen = true', conv2?.seen === true)

  await req('POST', '/messages', { conversationId: cid, type: 'text', content: 'after read' }, a.token)
  await sleep(500)
  r = await req('GET', '/conversations', undefined, b.token)
  const conv3 = data(r).conversations.find(c => c.id === cid)
  ok('+1 after read: unread = 1 (NOT 4)', conv3?.unreadCount === 1)
  ok('+1: seen = false', conv3?.seen === false)

  process.exit(summary().failed > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
