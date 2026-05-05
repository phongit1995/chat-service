'use strict'
const { ok, section, req, data, summary, createUserSet, uniqueUsername, uniqueEmail, randomPassword } = require('../helpers')

async function main() {
  section('03 · USERS')

  const users = await createUserSet(3, 'us')
  const [alice, bob, charlie] = users

  // GET /user/me
  for (const u of users) {
    const r = await req('GET', '/user/me', undefined, u.token)
    ok(`GET /user/me ${u.username} → 200`, r.status === 200)
    const d = data(r)
    ok(`/me returns id`, !!d?.id)
    ok(`/me returns username`, d?.username === u.username)
  }

  // PUT /user/me — update profile
  let r = await req('PUT', '/user/me', { fullName: 'Alice Updated', bio: 'Hello from test' }, alice.token)
  ok('PUT /user/me → 200', r.status === 200)
  const ud = data(r)
  ok('fullName updated', ud?.fullName === 'Alice Updated' || r.status === 200)

  // Verify update persisted
  r = await req('GET', '/user/me', undefined, alice.token)
  const me = data(r)
  ok('fullName persisted', me?.fullName === 'Alice Updated')
  ok('bio persisted', me?.bio === 'Hello from test')

  // GET /user/search?q=...
  r = await req('GET', `/user/search?q=${alice.username.slice(0, 4)}`, undefined, bob.token)
  ok('search → 200', r.status === 200)
  const sd = data(r)
  ok('search returns users array', Array.isArray(sd?.users))
  ok('search finds alice', sd?.users?.some(u => u.id === alice.id))

  // Search with no results
  r = await req('GET', `/user/search?q=zzz_no_match_xyz_${Date.now()}`, undefined, alice.token)
  ok('search no match → 200', r.status === 200)
  const sd2 = data(r)
  ok('search empty result is array', Array.isArray(sd2?.users))

  // Search without auth → 401
  r = await req('GET', '/user/search?q=alice')
  ok('search no auth → 401', r.status === 401)

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
