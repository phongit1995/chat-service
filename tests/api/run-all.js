'use strict'

const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const TESTS_DIR = path.join(__dirname, 'tests')

const files = fs.readdirSync(TESTS_DIR)
  .filter(f => f.endsWith('.test.js'))
  .sort()

let totalPassed = 0
let totalFailed = 0
const results = []

for (const file of files) {
  console.log(`\n▶  Running ${file}`)
  const r = spawnSync('node', [path.join(TESTS_DIR, file)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf-8',
  })
  process.stdout.write(r.stdout || '')
  if (r.stderr) process.stderr.write(r.stderr)

  const match = (r.stdout || '').match(/Results:\s+(\d+)\s+passed,\s+(\d+)\s+failed/)
  if (match) {
    const p = parseInt(match[1], 10)
    const f = parseInt(match[2], 10)
    totalPassed += p
    totalFailed += f
    results.push({ file, passed: p, failed: f })
  } else {
    console.error(`  ⚠️  Could not parse results for ${file}`)
    totalFailed++
    results.push({ file, passed: 0, failed: 1 })
  }
}

console.log('\n══════════════════════════════════════════')
console.log('  AGGREGATE RESULTS')
console.log('══════════════════════════════════════════')
for (const r of results) {
  const status = r.failed === 0 ? '✅' : '❌'
  console.log(`  ${status} ${r.file.padEnd(42)} ${r.passed} passed / ${r.failed} failed`)
}
console.log('──────────────────────────────────────────')
console.log(`  TOTAL: ${totalPassed} passed, ${totalFailed} failed`)
if (totalFailed === 0) console.log('  🎉 All tests passed!')
console.log('══════════════════════════════════════════\n')

process.exit(totalFailed > 0 ? 1 : 0)
