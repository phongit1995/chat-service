'use strict'
const { ok, section, req, data, sleep, summary, createUserSet, envInt, is2xx } = require('../helpers')

async function main() {
  section('10 · STRESS — multi-user group chat')

  const USER_COUNT = envInt('USERS', 5, 3, 20)
  const MSG_PER_USER = envInt('MSG_PER_USER', 3, 1, 20)
  console.log(`  → ${USER_COUNT} users, ${MSG_PER_USER} messages each`)

  const users = await createUserSet(USER_COUNT, 'st')
  const [creator, ...rest] = users

  // Create group with all users
  const r = await req('POST', '/conversations/group', {
    name: 'Stress Test Group',
    participantIds: rest.map(u => u.id),
  }, creator.token)
  ok('group created → 2xx', is2xx(r.status))
  const groupId = data(r)?.id

  // All users send messages
  const sends = []
  for (const user of users) {
    for (let i = 0; i < MSG_PER_USER; i++) {
      sends.push(req('POST', '/messages', {
        conversationId: groupId,
        type: 'text',
        content: `${user.username}: msg ${i + 1}`,
      }, user.token))
    }
  }

  const results = await Promise.all(sends)
  const successCount = results.filter(r => is2xx(r.status)).length
  const totalExpected = USER_COUNT * MSG_PER_USER
  ok(`all ${totalExpected} messages sent`, successCount === totalExpected)

  await sleep(1500)

  // History contains all messages
  const hr = await req('GET', `/messages/${groupId}?limit=200`, undefined, creator.token)
  const hist = data(hr)?.messages ?? []
  ok('history count matches', hist.length >= totalExpected)

  // All users still see the conversation
  for (const user of users) {
    const lr = await req('GET', '/conversations', undefined, user.token)
    const convs = data(lr)?.conversations ?? []
    ok(`${user.username} sees group`, convs.some(c => c.id === groupId))
  }

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
