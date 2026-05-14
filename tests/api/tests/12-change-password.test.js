'use strict'
const { ok, section, req, data, summary, registerUser, uniqueUsername, uniqueEmail, randomPassword } = require('../helpers')

async function main() {
  section('12 · CHANGE PASSWORD')

  const user = await registerUser(uniqueUsername('cp'), uniqueEmail('cp'), randomPassword(), 'Pwd User')
  const newPassword = randomPassword()
  const wrongCurrent = randomPassword()
  console.log(`  → user=${user.username} current=${user.password} new=${newPassword}`)

  let r = await req('POST', '/auth/change-password', {
    currentPassword: newPassword,
    newPassword,
  })
  ok('no token → 401', r.status === 401)

  r = await req('POST', '/auth/change-password', {
    currentPassword: user.password,
  }, user.token)
  ok('missing newPassword → 400', r.status === 400)

  r = await req('POST', '/auth/change-password', {
    newPassword,
  }, user.token)
  ok('missing currentPassword → 400', r.status === 400)

  r = await req('POST', '/auth/change-password', {
    currentPassword: user.password,
    newPassword: 'abc',
  }, user.token)
  ok('short newPassword → 400', r.status === 400)

  r = await req('POST', '/auth/change-password', {
    currentPassword: wrongCurrent,
    newPassword,
  }, user.token)
  ok('wrong currentPassword → 400/401', r.status === 400 || r.status === 401)

  r = await req('POST', '/auth/change-password', {
    currentPassword: user.password,
    newPassword,
  }, user.token)
  ok('valid change → 200', r.status === 200 || r.status === 201)

  r = await req('POST', '/auth/login', { email: user.email, password: user.password })
  ok('old password no longer works → 401', r.status === 401)

  r = await req('POST', '/auth/login', { email: user.email, password: newPassword })
  ok('login with new password → 200', r.status === 200 || r.status === 201)
  const ld = data(r)
  ok('new login returns token', !!ld?.token)

  const newToken = ld?.token
  r = await req('GET', '/user/me', undefined, newToken)
  ok('new token works on /user/me', r.status === 200)

  const newer = randomPassword()
  r = await req('POST', '/auth/change-password', {
    currentPassword: newPassword,
    newPassword: newer,
  }, newToken)
  ok('change password again → 200', r.status === 200 || r.status === 201)

  r = await req('POST', '/auth/login', { email: user.email, password: newer })
  ok('login with newest password → 200', r.status === 200 || r.status === 201)

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
