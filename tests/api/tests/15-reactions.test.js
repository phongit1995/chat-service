'use strict'
const { ok, section, req, data, sleep, summary, createUserSet, is2xx } = require('../helpers')

async function main() {
  section('15 · REACTIONS')

  const users = await createUserSet(3, 're')
  const [alice, bob, charlie] = users

  // Setup: alice ↔ bob direct conv + 1 message từ alice
  let r = await req('POST', '/conversations/direct', { recipientId: bob.id }, alice.token)
  const convId = data(r)?.id
  ok('create conv → 2xx', is2xx(r.status))

  r = await req('POST', '/messages', {
    conversationId: convId, type: 'text', content: 'React to me!',
  }, alice.token)
  ok('send message → 2xx', is2xx(r.status))
  const msgId = data(r)?.id
  ok('message has id', !!msgId)

  const reactURL = `/messages/${convId}/${msgId}/reactions`

  // ── Add reaction ──────────────────────────────────────────────────────────
  r = await req('POST', reactURL, { type: 'LIKE' }, bob.token)
  ok('bob react LIKE → 2xx', is2xx(r.status))
  let d = data(r)
  ok('response.reactions has LIKE', Array.isArray(d?.reactions?.LIKE))
  ok('LIKE contains bob', d?.reactions?.LIKE?.includes(bob.id))
  ok('LIKE count = 1', d?.reactions?.LIKE?.length === 1)

  // Alice add LOVE
  r = await req('POST', reactURL, { type: 'LOVE' }, alice.token)
  ok('alice react LOVE → 2xx', is2xx(r.status))
  d = data(r)
  ok('LIKE still has bob', d?.reactions?.LIKE?.includes(bob.id))
  ok('LOVE has alice', d?.reactions?.LOVE?.includes(alice.id))

  // Bob also add LOVE
  r = await req('POST', reactURL, { type: 'LOVE' }, bob.token)
  ok('bob react LOVE → 2xx', is2xx(r.status))
  d = data(r)
  ok('LOVE has both alice + bob', d?.reactions?.LOVE?.length === 2)
  ok('LOVE includes alice', d?.reactions?.LOVE?.includes(alice.id))
  ok('LOVE includes bob', d?.reactions?.LOVE?.includes(bob.id))

  // ── Toggle off (remove) ──────────────────────────────────────────────────
  r = await req('POST', reactURL, { type: 'LIKE' }, bob.token)
  ok('bob toggle LIKE off → 2xx', is2xx(r.status))
  d = data(r)
  ok('LIKE removed entirely (empty users)',
    !d?.reactions?.LIKE || d.reactions.LIKE.length === 0,
  )
  ok('LOVE unchanged after LIKE removal', d?.reactions?.LOVE?.length === 2)

  // Bob toggle LOVE off
  r = await req('POST', reactURL, { type: 'LOVE' }, bob.token)
  ok('bob toggle LOVE off → 2xx', is2xx(r.status))
  d = data(r)
  ok('LOVE still has alice only', d?.reactions?.LOVE?.length === 1)
  ok('LOVE no longer has bob', !d?.reactions?.LOVE?.includes(bob.id))

  // Alice toggle LOVE off → LOVE empty/deleted
  r = await req('POST', reactURL, { type: 'LOVE' }, alice.token)
  ok('alice toggle LOVE off → 2xx', is2xx(r.status))
  d = data(r)
  ok('LOVE fully removed', !d?.reactions?.LOVE || d.reactions.LOVE.length === 0)

  // ── Re-add after full removal ────────────────────────────────────────────
  r = await req('POST', reactURL, { type: 'HAHA' }, alice.token)
  ok('alice react HAHA → 2xx', is2xx(r.status))
  d = data(r)
  ok('HAHA has alice', d?.reactions?.HAHA?.includes(alice.id))

  // ── Validation: invalid type ─────────────────────────────────────────────
  r = await req('POST', reactURL, { type: 'INVALID_EMOJI' }, alice.token)
  ok('invalid type → 400', r.status === 400)

  r = await req('POST', reactURL, { type: 'like' }, alice.token)
  ok('lowercase type → 400', r.status === 400)

  r = await req('POST', reactURL, {}, alice.token)
  ok('missing type → 400', r.status === 400)

  // ── Auth: non-member cannot react ────────────────────────────────────────
  r = await req('POST', reactURL, { type: 'WOW' }, charlie.token)
  ok('non-member react → 403/4xx', r.status >= 400 && r.status < 500)

  // ── Auth: no token ───────────────────────────────────────────────────────
  r = await req('POST', reactURL, { type: 'WOW' })
  ok('no auth → 401', r.status === 401)

  // ── Max 5 types per user per message ─────────────────────────────────────
  // Alice already has HAHA. Add LIKE, LOVE, WOW, SAD → total 5. Then ANGRY → fail.
  for (const t of ['LIKE', 'LOVE', 'WOW', 'SAD']) {
    r = await req('POST', reactURL, { type: t }, alice.token)
    ok(`alice react ${t} (cap test) → 2xx`, is2xx(r.status))
  }
  r = await req('POST', reactURL, { type: 'ANGRY' }, alice.token)
  ok('alice 6th type ANGRY → 400 (max 5)', r.status === 400)

  // Remove one → can add again
  r = await req('POST', reactURL, { type: 'SAD' }, alice.token)
  ok('alice remove SAD → 2xx', is2xx(r.status))
  r = await req('POST', reactURL, { type: 'ANGRY' }, alice.token)
  ok('alice add ANGRY after removal → 2xx', is2xx(r.status))

  // ── Idempotency: re-toggle same emoji ────────────────────────────────────
  // Currently has: HAHA, LIKE, LOVE, WOW, ANGRY (5 types) for alice
  r = await req('POST', reactURL, { type: 'WOW' }, alice.token)
  ok('alice toggle WOW (remove) → 2xx', is2xx(r.status))
  r = await req('POST', reactURL, { type: 'WOW' }, alice.token)
  ok('alice toggle WOW again (add back) → 2xx', is2xx(r.status))
  d = data(r)
  ok('WOW has alice once (no dup)',
    d?.reactions?.WOW?.filter((u) => u === alice.id).length === 1,
  )

  // ── Reactions persist in GET /messages (cache invalidation test) ─────────
  // First GET to populate cache
  r = await req('GET', `/messages/${convId}`, undefined, alice.token)
  ok('pre-react GET → 200', r.status === 200)

  // React a new type after cache is warm
  r = await req('POST', reactURL, { type: 'ANGRY' }, bob.token)
  ok('bob react ANGRY after cache warm → 2xx', is2xx(r.status))

  // GET again immediately — must reflect new reaction (cache must be invalidated)
  await sleep(200)
  r = await req('GET', `/messages/${convId}`, undefined, alice.token)
  ok('post-react GET → 200', r.status === 200)
  const msg = data(r)?.messages?.find((m) => m.id === msgId)
  ok('message found in history', !!msg)
  ok('history message has reactions', typeof msg?.reactions === 'object')
  ok('history reactions.HAHA includes alice',
    Array.isArray(msg?.reactions?.HAHA) && msg.reactions.HAHA.includes(alice.id),
  )
  ok('history reactions.ANGRY includes bob (cache invalidated)',
    Array.isArray(msg?.reactions?.ANGRY) && msg.reactions.ANGRY.includes(bob.id),
  )

  // ── Invalid IDs ──────────────────────────────────────────────────────────
  r = await req('POST', `/messages/not-a-uuid/${msgId}/reactions`, { type: 'LIKE' }, alice.token)
  ok('invalid convId → 400', r.status === 400)

  r = await req('POST', `/messages/${convId}/not-a-timeuuid/reactions`, { type: 'LIKE' }, alice.token)
  ok('invalid msgId → 4xx/5xx', r.status >= 400)

  return summary()
}

if (require.main === module) {
  main().then((s) => process.exit(s.failed > 0 ? 1 : 0)).catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

module.exports = main
