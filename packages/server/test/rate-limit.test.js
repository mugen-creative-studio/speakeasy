import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter, clientKey } from '../src/rate-limit.js'

test('allows up to the limit, then blocks within the same window', () => {
  const rl = createRateLimiter({ limit: 3, windowMs: 1000 })
  const t = 10_000
  assert.equal(rl.hit('ip', t).allowed, true)
  assert.equal(rl.hit('ip', t).allowed, true)
  assert.equal(rl.hit('ip', t).allowed, true)
  const fourth = rl.hit('ip', t)
  assert.equal(fourth.allowed, false)
  assert.ok(fourth.retryAfterMs > 0, 'a blocked hit reports when to retry')
})

test('resets when the window rolls over', () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000 })
  assert.equal(rl.hit('ip', 0).allowed, true)
  assert.equal(rl.hit('ip', 500).allowed, false) // still the first window
  assert.equal(rl.hit('ip', 1000).allowed, true) // new window, counter reset
})

test('tracks each client key (IP) independently', () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000 })
  assert.equal(rl.hit('a', 0).allowed, true)
  assert.equal(rl.hit('b', 0).allowed, true) // a different IP has its own budget
  assert.equal(rl.hit('a', 0).allowed, false)
})

test('clientKey prefers the first x-forwarded-for entry, else the socket', () => {
  assert.equal(
    clientKey({ headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } }),
    '203.0.113.7',
  )
  assert.equal(clientKey({ socket: { remoteAddress: '127.0.0.1' } }), '127.0.0.1')
  assert.equal(clientKey({}), 'unknown')
})
