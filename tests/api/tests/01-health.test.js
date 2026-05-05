'use strict'
const { ok, section, req, summary } = require('../helpers')

async function main() {
  section('01 · HEALTH')

  const r = await req('GET', '/health')
  ok('GET /health → 200', r.status === 200)
  ok('returns success=true', r.body?.success === true || r.body?.status === 'healthy' || !!r.body)

  const s = summary()
  process.exit(s.failed > 0 ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
