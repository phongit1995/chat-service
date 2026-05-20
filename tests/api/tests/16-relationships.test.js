'use strict'
const { ok, section, req, data, summary, createUserSet, is2xx } = require('../helpers')

const FAKE_UUID = '00000000-0000-0000-0000-000000000000'
const NOT_UUID  = 'not-a-uuid'

const sendReq    = (from, toId)         => req('POST',   '/relationships/request',           { userId: toId }, from.token)
const respond    = (user, id, action)   => req('PUT',    `/relationships/${id}/respond`,     { action },      user.token)
const cancelReq  = (user, id)           => req('DELETE', `/relationships/${id}/cancel`,      undefined,       user.token)
const unfriendBy = (user, id)           => req('DELETE', `/relationships/${id}/unfriend`,    undefined,       user.token)
const block      = (from, toId)         => req('POST',   '/relationships/block',             { userId: toId }, from.token)
const unblock    = (user, id)           => req('DELETE', `/relationships/${id}/unblock`,     undefined,       user.token)
const pending    = (user, qs = '')      => req('GET',    `/relationships/pending${qs}`,      undefined,       user.token)
const sent       = (user, qs = '')      => req('GET',    `/relationships/sent${qs}`,         undefined,       user.token)
const friends    = (user, qs = '')      => req('GET',    `/relationships/friends${qs}`,      undefined,       user.token)
const blocked    = (user, qs = '')      => req('GET',    `/relationships/blocked${qs}`,      undefined,       user.token)

const findRelByAddressee = (list, id) => list.find(r => r.addresseeId === id)
const findRelByRequester = (list, id) => list.find(r => r.requesterId === id)
const friendListOf = (r) => data(r)?.friends ?? []
const relListOf    = (r) => data(r)?.relationships ?? []

async function makePair() {
  const [a, b] = await createUserSet(2, 'r')
  return { a, b }
}

async function pendingFromTo(from, to) {
  const r = await sendReq(from, to.id)
  return data(r)?.id
}

async function makeFriends(a, b) {
  const sr = await sendReq(a, b.id)
  const relId = data(sr)?.id
  await respond(b, relId, 'accept')
  return relId
}

async function makeBlocked(a, b) {
  const r = await block(a, b.id)
  return data(r)?.id
}

async function main() {
  section('16 · RELATIONSHIPS · Full edge-case matrix')

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 1: SEND friend request (11 cases)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 1: SendFriendRequest ──')
  {
    const [u1, u2, u3, u4, u5, u6, u7] = await createUserSet(7, 'r1')

    // 1.1 NONE → success
    let r = await sendReq(u1, u2.id)
    ok('1.1  NONE → 2xx success', is2xx(r.status))

    // 1.2 A→B PENDING → reject (already sent)
    r = await sendReq(u1, u2.id)
    ok('1.2  A→B PENDING → 409 already sent', r.status === 409)

    // 1.3 B→A PENDING → auto-accept ⚠️
    await sendReq(u3, u4.id)            // u3 → u4 pending
    r = await sendReq(u4, u3.id)        // u4 sends back
    ok('1.3a B→A PENDING → 2xx auto-accept', is2xx(r.status))
    ok('1.3b status = accepted', data(r)?.status === 'accepted')
    const fr = await friends(u4)
    ok('1.3c u4 sees u3 as friend', friendListOf(fr).some(f => f.id === u3.id))

    // 1.4 ACCEPTED → reject (already friends)
    r = await sendReq(u3, u4.id)
    ok('1.4  ACCEPTED → 409 already friends', r.status === 409)

    // 1.5 REJECTED → re-send OK (after fix: row deleted on reject) ⚠️
    await sendReq(u5, u6.id)
    let pendList = relListOf(await pending(u6))
    const relRej = findRelByRequester(pendList, u5.id)
    await respond(u6, relRej.id, 'reject')   // delete now
    r = await sendReq(u5, u6.id)
    ok('1.5  REJECTED → resend 2xx', is2xx(r.status))

    // 1.6 A blocked B, A sends → clearer reject ⚠️
    await block(u1, u7.id)
    r = await sendReq(u1, u7.id)
    ok('1.6a I blocked target → 400', r.status === 400)
    ok('1.6b error mentions unblock', /unblock|blocked/i.test(JSON.stringify(r.body)))

    // 1.7 B blocked A, A sends → reject "unable"
    r = await sendReq(u7, u1.id)        // u7 was blocked by u1; u7 tries to send to u1
    ok('1.7  blocked-by → 400', r.status === 400)

    // 1.8 self-target → 400
    r = await sendReq(u1, u1.id)
    ok('1.8  self → 400', r.status === 400)

    // 1.9 invalid UUID → 400
    r = await sendReq(u1, NOT_UUID)
    ok('1.9  invalid UUID → 400', r.status === 400)

    // 1.10 non-existent user → FK error → 4xx
    r = await sendReq(u1, FAKE_UUID)
    ok('1.10 non-existent user → 4xx', r.status >= 400 && r.status < 500)

    // 1.11 no auth → 401
    r = await req('POST', '/relationships/request', { userId: u2.id })
    ok('1.11 no auth → 401', r.status === 401)
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 2: ACCEPT friend request (8 cases)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 2: AcceptFriendRequest ──')
  {
    const [u1, u2, u3, u4, u5] = await createUserSet(5, 'r2')

    // 2.1 Pending, I am addressee → success
    let relId = await pendingFromTo(u1, u2)
    let r = await respond(u2, relId, 'accept')
    ok('2.1  pending addressee accepts → 2xx', is2xx(r.status))

    // 2.2 Pending, I am requester → 403
    const relId2 = await pendingFromTo(u3, u4)
    r = await respond(u3, relId2, 'accept')
    ok('2.2  requester self-accepts → 4xx', r.status >= 400 && r.status < 500)

    // 2.3 Pending, I am stranger → 4xx
    r = await respond(u5, relId2, 'accept')
    ok('2.3  stranger accepts → 4xx', r.status >= 400 && r.status < 500)

    // 2.4 ACCEPTED already → fail
    await respond(u4, relId2, 'accept')
    r = await respond(u4, relId2, 'accept')
    ok('2.4  already accepted → 400', r.status === 400)

    // 2.5 BLOCKED status → fail (block u1→u2; relId is now stale; block creates new state)
    await block(u1, u2.id)
    const blkList = relListOf(await blocked(u1))
    const blkId = findRelByAddressee(blkList, u2.id)?.id
    r = await respond(u2, blkId, 'accept')
    ok('2.5  accept blocked rel → 400', r.status === 400)

    // 2.6 non-existent id → 404
    r = await respond(u1, FAKE_UUID, 'accept')
    ok('2.6  non-existent → 404', r.status === 404)

    // 2.7 invalid action → 400
    const relId3 = await pendingFromTo(u3, u5)
    r = await respond(u5, relId3, 'invalid_action')
    ok('2.7  invalid action → 400', r.status === 400)

    // 2.8 no auth → 401
    r = await req('PUT', `/relationships/${relId3}/respond`, { action: 'accept' })
    ok('2.8  no auth → 401', r.status === 401)
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 3: REJECT friend request (8 cases)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 3: RejectFriendRequest ──')
  {
    const [u1, u2, u3, u4, u5] = await createUserSet(5, 'r3')

    // 3.1 Pending, addressee → success
    let relId = await pendingFromTo(u1, u2)
    let r = await respond(u2, relId, 'reject')
    ok('3.1  pending addressee rejects → 2xx', is2xx(r.status))

    // 3.2 After reject the row is deleted (fix #2)
    const pend = relListOf(await pending(u2))
    ok('3.2  rejected row deleted from pending', !pend.find(x => x.id === relId))

    // 3.3 Pending, I am requester → 4xx
    relId = await pendingFromTo(u3, u4)
    r = await respond(u3, relId, 'reject')
    ok('3.3  requester self-rejects → 4xx', r.status >= 400 && r.status < 500)

    // 3.4 Pending, I am stranger → 4xx
    r = await respond(u5, relId, 'reject')
    ok('3.4  stranger rejects → 4xx', r.status >= 400 && r.status < 500)

    // 3.5 ACCEPTED → can't reject
    const relId2 = await pendingFromTo(u3, u4)
    await respond(u4, relId2, 'accept')
    r = await respond(u4, relId2, 'reject')
    ok('3.5  accepted rel reject → 4xx', r.status >= 400 && r.status < 500)

    // 3.6 BLOCKED → can't reject
    const blockId = await makeBlocked(u1, u5)
    r = await respond(u5, blockId, 'reject')
    ok('3.6  blocked rel reject → 400', r.status === 400)

    // 3.7 non-existent → 404
    r = await respond(u1, FAKE_UUID, 'reject')
    ok('3.7  non-existent → 404', r.status === 404)

    // 3.8 no auth → 401
    const relId3 = await pendingFromTo(u1, u3)
    r = await req('PUT', `/relationships/${relId3}/respond`, { action: 'reject' })
    ok('3.8  no auth → 401', r.status === 401)
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 4: CANCEL friend request (7 cases)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 4: CancelFriendRequest ──')
  {
    const [u1, u2, u3, u4, u5] = await createUserSet(5, 'r4')

    // 4.1 my pending → success
    let relId = await pendingFromTo(u1, u2)
    let r = await cancelReq(u1, relId)
    ok('4.1  cancel my pending → 2xx', is2xx(r.status))

    // 4.2 cancel other's pending → 4xx
    relId = await pendingFromTo(u3, u4)
    r = await cancelReq(u4, relId)   // u4 (addressee) tries to cancel
    ok('4.2  addressee cannot cancel → 4xx', r.status >= 400 && r.status < 500)

    // 4.3 cancel ACCEPTED → 400
    await respond(u4, relId, 'accept')
    r = await cancelReq(u3, relId)
    ok('4.3  cancel accepted → 4xx', r.status >= 400 && r.status < 500)

    // 4.4 cancel BLOCKED → 4xx
    const blkId = await makeBlocked(u1, u5)
    r = await cancelReq(u1, blkId)
    ok('4.4  cancel blocked → 4xx', r.status >= 400 && r.status < 500)

    // 4.5 non-existent → 404
    r = await cancelReq(u1, FAKE_UUID)
    ok('4.5  non-existent → 404', r.status === 404)

    // 4.6 invalid UUID → 4xx
    r = await cancelReq(u1, NOT_UUID)
    ok('4.6  invalid UUID → 4xx', r.status >= 400 && r.status < 500)

    // 4.7 no auth → 401
    const relId2 = await pendingFromTo(u1, u2)
    r = await req('DELETE', `/relationships/${relId2}/cancel`)
    ok('4.7  no auth → 401', r.status === 401)
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 5: UNFRIEND (7 cases)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 5: Unfriend ──')
  {
    const [u1, u2, u3, u4, u5, u6] = await createUserSet(6, 'r5')

    // 5.1 As requester → success
    let relId = await makeFriends(u1, u2)
    let r = await unfriendBy(u1, relId)
    ok('5.1  unfriend as requester → 2xx', is2xx(r.status))

    // 5.2 As addressee → success
    relId = await makeFriends(u3, u4)
    r = await unfriendBy(u4, relId)
    ok('5.2  unfriend as addressee → 2xx', is2xx(r.status))

    // 5.3 Not part → 4xx
    relId = await makeFriends(u3, u4)
    r = await unfriendBy(u5, relId)
    ok('5.3  stranger unfriend → 4xx', r.status >= 400 && r.status < 500)

    // 5.4 PENDING status → 400
    relId = await pendingFromTo(u1, u5)
    r = await unfriendBy(u1, relId)
    ok('5.4  unfriend pending → 400', r.status === 400)

    // 5.5 BLOCKED status → 400
    const blkId = await makeBlocked(u1, u6)
    r = await unfriendBy(u1, blkId)
    ok('5.5  unfriend blocked → 400', r.status === 400)

    // 5.6 non-existent → 404
    r = await unfriendBy(u1, FAKE_UUID)
    ok('5.6  non-existent → 404', r.status === 404)

    // 5.7 no auth → 401
    r = await req('DELETE', `/relationships/${relId}/unfriend`)
    ok('5.7  no auth → 401', r.status === 401)
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 6: BLOCK user (10 cases)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 6: BlockUser ──')
  {
    const [u1, u2, u3, u4, u5, u6, u7, u8] = await createUserSet(8, 'r6')

    // 6.1 NONE → create
    let r = await block(u1, u2.id)
    ok('6.1  block stranger → 2xx', is2xx(r.status))
    ok('6.1b status = blocked', data(r)?.status === 'blocked')

    // 6.2 A→B pending → overwrite to blocked (cancels)
    await sendReq(u3, u4.id)
    r = await block(u3, u4.id)
    ok('6.2  block while my pending → 2xx', is2xx(r.status))
    const sentList = relListOf(await sent(u3))
    ok('6.2b my pending now gone', !findRelByAddressee(sentList, u4.id))

    // 6.3 B→A pending → overwrite (silent decline)
    await sendReq(u5, u4.id)
    r = await block(u4, u5.id)
    ok('6.3  block while their pending → 2xx', is2xx(r.status))
    const pendList = relListOf(await pending(u4))
    ok('6.3b their pending now gone', !findRelByRequester(pendList, u5.id))

    // 6.4 ACCEPTED → overwrite (auto-unfriend)
    await makeFriends(u6, u7)
    r = await block(u6, u7.id)
    ok('6.4  block friend → 2xx', is2xx(r.status))
    const u6Friends = friendListOf(await friends(u6))
    ok('6.4b u7 removed from u6 friends', !u6Friends.find(f => f.id === u7.id))

    // 6.5 Already blocked → idempotent
    r = await block(u1, u2.id)
    ok('6.5  re-block (idempotent) → 2xx', is2xx(r.status))

    // 6.6 Target already blocks me → reject (fix #4)
    r = await block(u2, u1.id)
    ok('6.6  blocked-by tries to block → 400', r.status === 400)

    // 6.7 Self → 400
    r = await block(u1, u1.id)
    ok('6.7  block self → 400', r.status === 400)

    // 6.8 Invalid UUID → 400
    r = await block(u1, NOT_UUID)
    ok('6.8  invalid UUID → 400', r.status === 400)

    // 6.9 Non-existent user → 4xx
    r = await block(u1, FAKE_UUID)
    ok('6.9  non-existent → 4xx', r.status >= 400 && r.status < 500)

    // 6.10 No auth → 401
    r = await req('POST', '/relationships/block', { userId: u8.id })
    ok('6.10 no auth → 401', r.status === 401)
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 7: UNBLOCK (7 cases)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 7: UnblockUser ──')
  {
    const [u1, u2, u3, u4, u5] = await createUserSet(5, 'r7')

    // 7.1 my block → success
    let blkId = await makeBlocked(u1, u2)
    let r = await unblock(u1, blkId)
    ok('7.1  unblock my block → 2xx', is2xx(r.status))

    // 7.2 Not the blocker → 4xx
    blkId = await makeBlocked(u3, u4)
    r = await unblock(u4, blkId)
    ok('7.2  not the blocker → 4xx', r.status >= 400 && r.status < 500)

    // 7.3 Status != blocked → 400 (try unblock on pending row)
    const relId = await pendingFromTo(u1, u5)
    r = await unblock(u1, relId)
    ok('7.3  unblock pending row → 4xx', r.status >= 400 && r.status < 500)

    // 7.4 After unblock, row deleted (re-unblock → 404)
    r = await unblock(u3, blkId)        // first unblock succeeds
    ok('7.4a unblock OK', is2xx(r.status))
    r = await unblock(u3, blkId)        // second time
    ok('7.4b re-unblock → 404', r.status === 404)

    // 7.5 Non-existent → 404
    r = await unblock(u1, FAKE_UUID)
    ok('7.5  non-existent → 404', r.status === 404)

    // 7.6 After unblock, can re-send request
    blkId = await makeBlocked(u1, u2)
    await unblock(u1, blkId)
    r = await sendReq(u1, u2.id)
    ok('7.6  unblock → resend request OK', is2xx(r.status))

    // 7.7 No auth → 401
    r = await req('DELETE', `/relationships/${blkId}/unblock`)
    ok('7.7  no auth → 401', r.status === 401)
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 8: List endpoints (24 cases)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 8: List endpoints ──')
  {
    const [u1, u2, u3, u4, u5] = await createUserSet(5, 'r8')

    // FRIENDS list (6)
    let fr = await friends(u1)
    ok('8.1  friends empty → 2xx', is2xx(fr.status))
    ok('8.2  friends empty list', friendListOf(fr).length === 0)

    await makeFriends(u1, u2)
    await makeFriends(u1, u3)
    await makeFriends(u1, u4)

    fr = await friends(u1)
    ok('8.3  friends has 3', friendListOf(fr).length === 3)
    ok('8.4  friends has total/limit/offset', typeof data(fr)?.total === 'number' && typeof data(fr)?.limit === 'number' && typeof data(fr)?.offset === 'number')

    fr = await friends(u1, '?limit=2')
    ok('8.5  friends limit=2 → 2 items', friendListOf(fr).length === 2)

    fr = await friends(u1, '?limit=2&offset=2')
    ok('8.6  friends offset=2 → 1 item', friendListOf(fr).length === 1)

    let r = await req('GET', '/relationships/friends')
    ok('8.7  friends no auth → 401', r.status === 401)

    // SENT list (6)
    let s = await sent(u5)
    ok('8.8  sent empty', relListOf(s).length === 0)

    await sendReq(u5, u1.id)
    await sendReq(u5, u2.id)
    await sendReq(u5, u3.id)

    s = await sent(u5)
    ok('8.9  sent has 3', relListOf(s).length === 3)
    ok('8.10 sent total=3', data(s)?.total === 3)

    s = await sent(u5, '?limit=2')
    ok('8.11 sent limit=2', relListOf(s).length === 2)

    s = await sent(u5, '?offset=10')
    ok('8.12 sent offset beyond → empty', relListOf(s).length === 0)

    r = await req('GET', '/relationships/sent')
    ok('8.13 sent no auth → 401', r.status === 401)

    // PENDING list (6)
    let p = await pending(u1)
    const u1Pending = relListOf(p)
    ok('8.14 pending shape OK', Array.isArray(u1Pending))
    ok('8.15 u1 has u5 request', u1Pending.some(x => x.requesterId === u5.id))

    p = await pending(u1, '?limit=1')
    ok('8.16 pending limit=1', relListOf(p).length === 1)

    p = await pending(u1, '?offset=99')
    ok('8.17 pending offset beyond → empty', relListOf(p).length === 0)

    p = await pending(u1, '?limit=999')        // clamp to 100
    ok('8.18 pending huge limit clamped', data(p)?.limit <= 100)

    r = await req('GET', '/relationships/pending')
    ok('8.19 pending no auth → 401', r.status === 401)

    // BLOCKED list (5)
    let bl = await blocked(u4)
    ok('8.20 blocked empty', relListOf(bl).length === 0)

    await block(u4, u1.id)
    await block(u4, u2.id)
    bl = await blocked(u4)
    ok('8.21 blocked has 2', relListOf(bl).length === 2)

    bl = await blocked(u4, '?limit=1')
    ok('8.22 blocked limit=1', relListOf(bl).length === 1)
    ok('8.23 blocked total=2', data(bl)?.total === 2)

    r = await req('GET', '/relationships/blocked')
    ok('8.24 blocked no auth → 401', r.status === 401)
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 9: Integration / end-to-end flows (15 cases)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 9: Integration flows ──')
  {
    const [u1, u2, u3, u4, u5] = await createUserSet(5, 'r9')

    // 9.1 Request → accept → both see in friends
    await makeFriends(u1, u2)
    const u1f = friendListOf(await friends(u1))
    const u2f = friendListOf(await friends(u2))
    ok('9.1a u1 sees u2 as friend', u1f.some(f => f.id === u2.id))
    ok('9.1b u2 sees u1 as friend', u2f.some(f => f.id === u1.id))

    // 9.2 Request → reject → neither has friend
    const relId = await pendingFromTo(u3, u4)
    await respond(u4, relId, 'reject')
    const u3f = friendListOf(await friends(u3))
    const u4f = friendListOf(await friends(u4))
    ok('9.2  neither has friend after reject',
      !u3f.find(f => f.id === u4.id) && !u4f.find(f => f.id === u3.id))

    // 9.3 Reject → re-send (fix #2)
    let r = await sendReq(u3, u4.id)
    ok('9.3  resend after reject → 2xx', is2xx(r.status))

    // 9.4 Cancel → resend
    const relId2 = await pendingFromTo(u1, u3)
    await cancelReq(u1, relId2)
    r = await sendReq(u1, u3.id)
    ok('9.4  resend after cancel → 2xx', is2xx(r.status))

    // 9.5 Unfriend → can re-request
    const frId = await makeFriends(u1, u5)
    await unfriendBy(u1, frId)
    r = await sendReq(u1, u5.id)
    ok('9.5  re-request after unfriend → 2xx', is2xx(r.status))

    // 9.6 A blocks B → B no longer sees A as friend
    const [v1, v2] = await createUserSet(2, 'r9b')
    await makeFriends(v1, v2)
    await block(v1, v2.id)
    const v2friends = friendListOf(await friends(v2))
    ok('9.6  blocked party no longer sees friend', !v2friends.find(f => f.id === v1.id))

    // 9.7 PENDING A→B then B blocks A → A's outgoing gone
    const [w1, w2] = await createUserSet(2, 'r9c')
    await sendReq(w1, w2.id)
    await block(w2, w1.id)
    const w1Sent = relListOf(await sent(w1))
    ok('9.7  outgoing cleared when blocked by recipient', !findRelByAddressee(w1Sent, w2.id))

    // 9.8 PENDING A→B then A blocks B → cancelled
    const [x1, x2] = await createUserSet(2, 'r9d')
    await sendReq(x1, x2.id)
    await block(x1, x2.id)
    const x1Sent = relListOf(await sent(x1))
    ok('9.8  outgoing cleared when blocker is sender', !findRelByAddressee(x1Sent, x2.id))

    // 9.9 Block → unblock → can request
    const [y1, y2] = await createUserSet(2, 'r9e')
    const blkY = await makeBlocked(y1, y2)
    await unblock(y1, blkY)
    r = await sendReq(y1, y2.id)
    ok('9.9  block→unblock→request OK', is2xx(r.status))

    // 9.10 A blocks B, B tries request → reject
    const [z1, z2] = await createUserSet(2, 'r9f')
    await block(z1, z2.id)
    r = await sendReq(z2, z1.id)
    ok('9.10 blocked party sends → 4xx', r.status >= 400)

    // 9.11 Cancel idempotency: second cancel → 404
    const relC = await pendingFromTo(u1, u4)
    await cancelReq(u1, relC)
    r = await cancelReq(u1, relC)
    ok('9.11 double-cancel → 404', r.status === 404)

    // 9.12 Multiple outgoing requests count
    const [m1, m2, m3, m4, m5] = await createUserSet(5, 'r9g')
    for (const t of [m2, m3, m4, m5]) await sendReq(m1, t.id)
    const m1Sent = await sent(m1)
    ok('9.12 m1 sent total = 4', data(m1Sent)?.total === 4)

    // 9.13 Friend count consistent both directions
    const [k1, k2] = await createUserSet(2, 'r9h')
    await makeFriends(k1, k2)
    const k1tot = data(await friends(k1))?.total
    const k2tot = data(await friends(k2))?.total
    ok('9.13 friend total both sides ≥ 1', k1tot >= 1 && k2tot >= 1)

    // 9.14 Blocked user not in friends list (after block)
    const [p1, p2] = await createUserSet(2, 'r9i')
    await makeFriends(p1, p2)
    await block(p1, p2.id)
    const p1F = friendListOf(await friends(p1))
    ok('9.14 blocker no longer sees blocked as friend', !p1F.find(f => f.id === p2.id))

    // 9.15 Blocked list shows only my blocks (not blocks against me)
    const [q1, q2] = await createUserSet(2, 'r9j')
    await block(q1, q2.id)
    const q2Blocked = relListOf(await blocked(q2))
    ok('9.15 q2 does NOT see q1 in their blocked list',
      !findRelByRequester(q2Blocked, q1.id))
  }

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 10: Validation edge & invariants (15+ cases)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n── SECTION 10: Validation & invariants ──')
  {
    const [u1, u2, u3, u4, u5] = await createUserSet(5, 'r10')

    // 10.1 missing userId field → 400
    let r = await req('POST', '/relationships/request', {}, u1.token)
    ok('10.1  missing userId → 400', r.status === 400)

    // 10.2 empty userId string → 400
    r = await req('POST', '/relationships/request', { userId: '' }, u1.token)
    ok('10.2  empty userId → 400', r.status === 400)

    // 10.3 block: missing userId → 400
    r = await req('POST', '/relationships/block', {}, u1.token)
    ok('10.3  block missing userId → 400', r.status === 400)

    // 10.4 invalid token → 401
    r = await req('POST', '/relationships/request', { userId: u2.id }, 'garbage.token.here')
    ok('10.4  invalid token → 401', r.status === 401)

    // 10.5 limit=0 → clamps to default
    await sendReq(u1, u2.id)
    let s2 = await sent(u1, '?limit=0')
    ok('10.5  limit=0 falls back to default (20)', data(s2)?.limit === 20)

    // 10.6 limit=-5 → default
    s2 = await sent(u1, '?limit=-5')
    ok('10.6  limit=-5 falls back to default', data(s2)?.limit === 20)

    // 10.7 limit=999 → clamped to 100
    s2 = await sent(u1, '?limit=999')
    ok('10.7  limit=999 clamped to 100', data(s2)?.limit === 100)

    // 10.8 offset=-1 → 0
    s2 = await sent(u1, '?offset=-1')
    ok('10.8  offset=-1 falls back to 0', data(s2)?.offset === 0)

    // 10.9 'sent' contains only PENDING (no ACCEPTED)
    const rid = await pendingFromTo(u3, u4)
    await respond(u4, rid, 'accept')   // becomes accepted
    const u3sent = relListOf(await sent(u3))
    ok('10.9  sent excludes accepted', !u3sent.find(x => x.addresseeId === u4.id))

    // 10.10 'pending' only when I'm addressee
    const u3pending = relListOf(await pending(u3))
    ok('10.10 my pending excludes my own outgoing', !u3pending.find(x => x.requesterId === u3.id))

    // 10.11 After auto-accept, no leftover in pending of either side
    const [t1, t2] = await createUserSet(2, 'r10b')
    await sendReq(t1, t2.id)
    await sendReq(t2, t1.id)            // auto-accept
    const t1Pending = relListOf(await pending(t1))
    const t2Pending = relListOf(await pending(t2))
    ok('10.11a auto-accept clears t1 pending', !findRelByRequester(t1Pending, t2.id))
    ok('10.11b auto-accept clears t2 pending', !findRelByRequester(t2Pending, t1.id))

    // 10.12 Block when prior REJECTED row existed (now deleted via fix #2) → fresh create
    const [w1, w2] = await createUserSet(2, 'r10c')
    const wid = await pendingFromTo(w1, w2)
    await respond(w2, wid, 'reject')
    r = await block(w1, w2.id)
    ok('10.12 block after reject row gone → 2xx', is2xx(r.status))

    // 10.13 Friend → block → unblock: not auto-friend (must re-send)
    const [k1, k2] = await createUserSet(2, 'r10d')
    await makeFriends(k1, k2)
    const blkK = await makeBlocked(k1, k2)
    await unblock(k1, blkK)
    const k1Friends = friendListOf(await friends(k1))
    ok('10.13 unblock does not restore friendship', !k1Friends.find(f => f.id === k2.id))

    // 10.14 Concurrent send A→B → one succeeds, one rejected (race)
    const [c1, c2] = await createUserSet(2, 'r10e')
    const [resA, resB] = await Promise.all([
      sendReq(c1, c2.id),
      sendReq(c1, c2.id),
    ])
    const wins = [resA, resB].filter(x => is2xx(x.status)).length
    const fails = [resA, resB].filter(x => x.status >= 400).length
    ok('10.14 concurrent duplicate → exactly 1 success', wins === 1 && fails === 1)

    // 10.15 Friends order: most recently actioned first
    const [o1, o2, o3, o4] = await createUserSet(4, 'r10f')
    await makeFriends(o1, o2)
    await new Promise(res => setTimeout(res, 50))
    await makeFriends(o1, o3)
    await new Promise(res => setTimeout(res, 50))
    await makeFriends(o1, o4)
    const ordList = friendListOf(await friends(o1))
    ok('10.15 friends order: latest first', ordList[0]?.id === o4.id)

    // Touch u5 so it is used (avoids unused warnings in fresh runs)
    void u5
  }

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
