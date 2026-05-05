'use strict'

const BASE    = process.env.API_BASE || 'http://localhost:8080/api'
const WS_BASE = process.env.WS_BASE  || 'http://localhost:8080'

let _passed = 0
let _failed = 0

function ok(label, result) {
  if (result) {
    console.log(`  ✅ ${label}`)
    _passed++
  } else {
    console.error(`  ❌ ${label}`)
    _failed++
  }
}

function section(title) {
  console.log(`\n══════════════════════════════════════════`)
  console.log(`  ${title}`)
  console.log(`══════════════════════════════════════════`)
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, body: json }
}

// Unwrap ApiResponse.data (Go server wraps all responses in { success, data, ... })
function data(r) {
  return r.body?.data ?? r.body
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const ALPHANUM = 'abcdefghijklmnopqrstuvwxyz0123456789'
function randStr(n) {
  let s = ''
  for (let i = 0; i < n; i++) s += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]
  return s
}

function uniqueUsername(prefix = 'u') {
  return `${prefix}${Date.now().toString(36).slice(-5)}${randStr(4)}`
}

function uniqueEmail(prefix = 'u') {
  return `${prefix}${Date.now().toString(36).slice(-5)}${randStr(4)}@test.com`
}

function randomPassword() {
  let letters = ''
  for (let i = 0; i < 4; i++) letters += ALPHANUM[Math.floor(Math.random() * 26)]
  let digits = ''
  for (let i = 0; i < 4; i++) digits += Math.floor(Math.random() * 10)
  return letters + digits
}

async function registerUser(username, email, password, fullName) {
  const r = await req('POST', '/auth/register', {
    username,
    email,
    password,
    full_name: fullName || username,
  })
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`register ${username} failed: ${r.status} ${JSON.stringify(r.body)}`)
  }
  // login to get token
  const lr = await req('POST', '/auth/login', { email, password })
  if (lr.status !== 200 && lr.status !== 201) {
    throw new Error(`login ${email} failed: ${lr.status} ${JSON.stringify(lr.body)}`)
  }
  const d = data(lr)
  const meR = await req('GET', '/user/me', undefined, d.token)
  const me = data(meR)
  return {
    token: d.token,
    refreshToken: d.refreshToken,
    id: me.id,
    username,
    email,
    password,
  }
}

async function createUserSet(count = 5, prefix = 'u') {
  const NAMES = [
    'Alice','Bob','Charlie','Dana','Eve','Frank','Grace','Henry',
    'Ivy','Jack','Kate','Liam','Mia','Noah','Olivia','Pete',
  ]
  const users = []
  for (let i = 0; i < count; i++) {
    const uname = uniqueUsername(prefix)
    const email = uniqueEmail(prefix)
    const pw = randomPassword()
    const u = await registerUser(uname, email, pw, NAMES[i % NAMES.length])
    users.push(u)
  }
  return users
}

function envInt(name, def, min = 1, max = 1000) {
  const v = parseInt(process.env[name], 10)
  if (Number.isNaN(v)) return def
  return Math.max(min, Math.min(max, v))
}

function summary() {
  console.log('\n──────────────────────────────────────────')
  console.log(`  Results: ${_passed} passed, ${_failed} failed`)
  if (_failed === 0) console.log('  🎉 All tests passed!')
  else console.log(`  ⚠️  ${_failed} test(s) failed`)
  console.log('──────────────────────────────────────────\n')
  return { passed: _passed, failed: _failed }
}

function counts() { return { passed: _passed, failed: _failed } }
function reset() { _passed = 0; _failed = 0 }

const is2xx = (status) => status >= 200 && status < 300

module.exports = {
  BASE, WS_BASE,
  ok, section, req, data, sleep, is2xx,
  uniqueUsername, uniqueEmail, randomPassword, registerUser, createUserSet,
  envInt,
  summary, counts, reset,
}
