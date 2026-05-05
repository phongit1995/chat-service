'use strict'
const { ok, section, req, data, sleep, summary, createUserSet } = require('../helpers')

async function main() {
  section('07 · CONVERSATION ORDERING')

  const users = await createUserSet(3, 'ord')
  const [alice, bob, charlie] = users

  // Create 3 conversations
  let r = await req('POST', '/conversations/direct', { recipientId: bob.id }, alice.token)
  const convAB = data(r)?.id

  r = await req('POST', '/conversations/group', {
    name: 'Group Alpha',
    participantIds: [bob.id, charlie.id],
  }, alice.token)
  const groupAlpha = data(r)?.id

  r = await req('POST', '/conversations/group', {
    name: 'Group Beta',
    participantIds: [bob.id, charlie.id],
  }, alice.token)
  const groupBeta = data(r)?.id

  // Bump Alpha with a message
  await req('POST', '/messages', { conversationId: groupAlpha, type: 'text', content: 'bump Alpha' }, alice.token)
  await sleep(500)

  r = await req('GET', '/conversations', undefined, alice.token)
  const list1 = data(r)?.conversations ?? []
  ok('Alpha at top after msg', list1[0]?.id === groupAlpha)

  // Bump Beta with a message
  await req('POST', '/messages', { conversationId: groupBeta, type: 'text', content: 'bump Beta' }, alice.token)
  await sleep(500)

  r = await req('GET', '/conversations', undefined, alice.token)
  const list2 = data(r)?.conversations ?? []
  ok('Beta at top after msg', list2[0]?.id === groupBeta)

  // Bump direct with a message from bob
  await req('POST', '/messages', { conversationId: convAB, type: 'text', content: 'bump direct' }, bob.token)
  await sleep(500)

  r = await req('GET', '/conversations', undefined, alice.token)
  const list3 = data(r)?.conversations ?? []
  ok('direct at top after bob msg', list3[0]?.id === convAB)

  // Verify strict ordering: direct > Beta > Alpha
  const ids = list3.map(c => c.id)
  ok('ordering: direct > Beta > Alpha',
     ids.indexOf(convAB) < ids.indexOf(groupBeta) &&
     ids.indexOf(groupBeta) < ids.indexOf(groupAlpha))

  // lastMessageText updated in sidebar
  ok('lastMessageText in direct', list3.find(c => c.id === convAB)?.lastMessageText === 'bump direct' ||
     !!list3.find(c => c.id === convAB)?.lastMessageText)

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
