'use strict'
const { ok, section, req, data, summary, createUserSet, is2xx } = require('../helpers')

async function main() {
  section('05 · MEMBERS & RELATIONSHIPS')

  const users = await createUserSet(4, 'mb')
  const [alice, bob, charlie, dana] = users

  // ── Friend request flow ───────────────────────────────────────────────────
  let r = await req('POST', '/relationships/request', { addresseeId: bob.id }, alice.token)
  ok('alice sends friend request → 2xx', is2xx(r.status))

  // Alice's sent requests
  r = await req('GET', '/relationships/sent', undefined, alice.token)
  ok('sent requests → 200', r.status === 200)
  const sentList = data(r)?.relationships ?? []
  ok('sent is array', Array.isArray(sentList))
  ok('contains bob request', sentList.some(rq => rq.addresseeId === bob.id || rq.addressee?.id === bob.id))

  // Bob's pending requests
  r = await req('GET', '/relationships/pending', undefined, bob.token)
  ok('pending requests → 200', r.status === 200)
  const pendingList = data(r)?.relationships ?? []
  ok('pending is array', Array.isArray(pendingList))
  ok('contains alice request', pendingList.some(rq => rq.requesterId === alice.id || rq.requester?.id === alice.id))

  // Bob accepts
  const pendingReq = pendingList.find(rq => rq.requesterId === alice.id || rq.requester?.id === alice.id)
  if (pendingReq) {
    r = await req('PUT', `/relationships/${pendingReq.id}/respond`, { action: 'accept' }, bob.token)
    ok('bob accepts → 2xx', is2xx(r.status))

    r = await req('GET', '/relationships/friends', undefined, alice.token)
    ok('alice friends → 200', r.status === 200)
    const aliceFriends = data(r)?.friends ?? []
    ok('alice sees bob as friend', aliceFriends.some(f => f.id === bob.id))

    r = await req('GET', '/relationships/friends', undefined, bob.token)
    const bobFriends = data(r)?.friends ?? []
    ok('bob sees alice as friend', bobFriends.some(f => f.id === alice.id))
  } else {
    ok('found pending request', false)
    ok('alice in bob friends', false)
    ok('bob in alice friends', false)
  }

  // ── Decline request ────────────────────────────────────────────────────────
  r = await req('POST', '/relationships/request', { addresseeId: charlie.id }, dana.token)
  ok('dana requests charlie → 2xx', is2xx(r.status))

  r = await req('GET', '/relationships/pending', undefined, charlie.token)
  const charlieList = data(r)?.relationships ?? []
  const danaReq = charlieList.find(rq => rq.requesterId === dana.id || rq.requester?.id === dana.id)
  if (danaReq) {
    r = await req('PUT', `/relationships/${danaReq.id}/respond`, { action: 'reject' }, charlie.token)
    ok('charlie declines dana → 2xx', is2xx(r.status))
  } else {
    ok('charlie declines dana', false)
  }

  // ── Block user ─────────────────────────────────────────────────────────────
  r = await req('POST', '/relationships/block', { addresseeId: charlie.id }, alice.token)
  ok('alice blocks charlie → 2xx', is2xx(r.status))

  r = await req('GET', '/relationships/blocked', undefined, alice.token)
  ok('blocked list → 200', r.status === 200)
  const blocked = data(r)?.relationships ?? []
  ok('charlie in blocked list', Array.isArray(blocked) &&
    blocked.some(b => b.addresseeId === charlie.id || b.addressee?.id === charlie.id))

  // ── Cancel friend request ──────────────────────────────────────────────────
  r = await req('POST', '/relationships/request', { addresseeId: dana.id }, alice.token)
  ok('alice requests dana → 2xx', is2xx(r.status))
  const cancelId = data(r)?.id
  if (cancelId) {
    r = await req('DELETE', `/relationships/${cancelId}/cancel`, undefined, alice.token)
    ok('alice cancels request → 2xx', is2xx(r.status))
  } else {
    ok('cancel request id found', false)
  }

  // ── Unfriend ───────────────────────────────────────────────────────────────
  // dana and bob: dana requests, bob accepts, then dana unfriends
  r = await req('POST', '/relationships/request', { addresseeId: bob.id }, dana.token)
  const unfriendReq = data(r)
  if (unfriendReq?.id) {
    r = await req('GET', '/relationships/pending', undefined, bob.token)
    const bobPending2 = data(r)?.relationships ?? []
    const danaReq = bobPending2.find(rq => rq.requesterId === dana.id || rq.requester?.id === dana.id)
    if (danaReq) {
      await req('PUT', `/relationships/${danaReq.id}/respond`, { action: 'accept' }, bob.token)
      r = await req('DELETE', `/relationships/${danaReq.id}/unfriend`, undefined, dana.token)
      ok('dana unfriends bob → 2xx', is2xx(r.status))
    } else {
      ok('dana unfriends bob → 2xx', false)
    }
  } else {
    ok('dana unfriends bob → 2xx', false)
  }

  // ── No auth → 401 ─────────────────────────────────────────────────────────
  r = await req('GET', '/relationships/friends')
  ok('friends no auth → 401', r.status === 401)

  r = await req('POST', '/relationships/request', { addresseeId: bob.id })
  ok('send request no auth → 401', r.status === 401)

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
