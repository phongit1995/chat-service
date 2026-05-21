'use strict'
const { ok, section, req, data, summary, createUserSet, is2xx } = require('../helpers')

async function main() {
  section('17 · LOGOUT + MUTE CONVERSATION')

  // ── SECTION A: Logout / token blacklist ──────────────────────────────────
  console.log('\n── A: Logout ──')
  const [alice, bob] = await createUserSet(2, 'lg')

  let r = await req('GET', '/user/me', undefined, alice.token)
  ok('A.1  valid token works → 2xx', is2xx(r.status))

  r = await req('POST', '/auth/logout', undefined, alice.token)
  ok('A.2  logout → 2xx', is2xx(r.status))

  r = await req('GET', '/user/me', undefined, alice.token)
  ok('A.3  same token after logout → 401', r.status === 401)
  ok('A.4  error mentions revoked', /revoked|invalid/i.test(JSON.stringify(r.body)))

  r = await req('POST', '/auth/logout')
  ok('A.5  logout no auth → 401', r.status === 401)

  r = await req('POST', '/auth/logout', undefined, 'fake.token.here')
  ok('A.6  logout invalid token → 401', r.status === 401)

  r = await req('POST', '/auth/login', { email: alice.email, password: alice.password })
  ok('A.7  fresh login after logout → 2xx', is2xx(r.status))
  const newToken = data(r)?.token

  r = await req('GET', '/user/me', undefined, newToken)
  ok('A.8  new token works', is2xx(r.status))

  r = await req('GET', '/user/me', undefined, bob.token)
  ok('A.9  other user not affected', is2xx(r.status))

  // ── SECTION C: Refresh token ─────────────────────────────────────────────
  console.log('\n── C: Refresh token ──')
  const [carol] = await createUserSet(1, 'rf')

  let lr = await req('POST', '/auth/login', { email: carol.email, password: carol.password })
  ok('C.1  login → 2xx', is2xx(lr.status))
  const oldAccess = data(lr)?.token
  const oldRefresh = data(lr)?.refreshToken
  ok('C.2  login returns refresh token', typeof oldRefresh === 'string' && oldRefresh.length > 0)

  r = await req('POST', '/auth/refresh', { refreshToken: oldRefresh })
  ok('C.3  refresh → 2xx', is2xx(r.status))
  const newAccess = data(r)?.token
  const newRefresh = data(r)?.refreshToken
  ok('C.4  returns new access token', typeof newAccess === 'string' && newAccess !== oldAccess)
  ok('C.5  returns new (rotated) refresh token', typeof newRefresh === 'string' && newRefresh !== oldRefresh)

  r = await req('GET', '/user/me', undefined, newAccess)
  ok('C.6  new access token works', is2xx(r.status))

  r = await req('POST', '/auth/refresh', { refreshToken: oldRefresh })
  ok('C.7  old refresh token rejected (rotation) → 401', r.status === 401)

  r = await req('POST', '/auth/refresh', {})
  ok('C.8  empty body → 400', r.status === 400)

  r = await req('POST', '/auth/refresh', { refreshToken: 'garbage' })
  ok('C.9  invalid refresh → 401', r.status === 401)

  r = await req('POST', '/auth/logout', undefined, newAccess)
  ok('C.10 logout → 2xx', is2xx(r.status))

  r = await req('POST', '/auth/refresh', { refreshToken: newRefresh })
  ok('C.11 refresh after logout → 401 (cleared from DB)', r.status === 401)

  // ── SECTION B: Mute / Unmute conversation ────────────────────────────────
  console.log('\n── B: Mute ──')
  const [u1, u2, u3] = await createUserSet(3, 'mu')

  r = await req('POST', '/conversations/direct', { recipientId: u2.id }, u1.token)
  ok('B.1  create direct → 2xx', is2xx(r.status))
  const convId = data(r)?.id

  r = await req('GET', '/conversations', undefined, u1.token)
  let convs = data(r)?.conversations ?? []
  let conv = convs.find(c => c.id === convId)
  ok('B.2  isMuted default false', conv?.isMuted === false)

  r = await req('POST', `/conversations/${convId}/mute`, undefined, u1.token)
  ok('B.3  mute → 2xx', is2xx(r.status))

  r = await req('GET', '/conversations', undefined, u1.token)
  convs = data(r)?.conversations ?? []
  conv = convs.find(c => c.id === convId)
  ok('B.4  isMuted = true after mute', conv?.isMuted === true)

  r = await req('POST', `/conversations/${convId}/mute`, undefined, u1.token)
  ok('B.5  mute idempotent → 2xx', is2xx(r.status))

  r = await req('GET', '/conversations', undefined, u2.token)
  const u2convs = data(r)?.conversations ?? []
  const u2conv = u2convs.find(c => c.id === convId)
  ok('B.6  u2 unaffected (still unmuted)', u2conv?.isMuted === false)

  r = await req('POST', `/conversations/${convId}/unmute`, undefined, u1.token)
  ok('B.7  unmute → 2xx', is2xx(r.status))

  r = await req('GET', '/conversations', undefined, u1.token)
  convs = data(r)?.conversations ?? []
  conv = convs.find(c => c.id === convId)
  ok('B.8  isMuted = false after unmute', conv?.isMuted === false)

  r = await req('POST', `/conversations/${convId}/mute`, undefined, u3.token)
  ok('B.9  non-member mute → 4xx', r.status >= 400 && r.status < 500)

  r = await req('POST', '/conversations/not-a-uuid/mute', undefined, u1.token)
  ok('B.10 invalid convId → 400', r.status === 400)

  r = await req('POST', `/conversations/${convId}/mute`)
  ok('B.11 no auth → 401', r.status === 401)

  r = await req('POST', `/conversations/${convId}/unmute`)
  ok('B.12 unmute no auth → 401', r.status === 401)

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(1) })
