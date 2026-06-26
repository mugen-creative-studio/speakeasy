// Direct tests for handleLookup, the one function that decides what leaves the
// server. These guard the two security guarantees: (1) only PRIVATE payloads
// travel, and only for a live slug; (2) unknown, deactivated, and expired slugs
// return one byte-identical 404 that never carries content.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleLookup } from '../src/handlers.js'

const content = {
  async items() {
    return [
      { id: 'pub-1', title: 'Public One', visibility: 'public' },
      { id: 'pub-2', title: 'Public Two', visibility: 'public' },
      { id: 'sec-1', title: 'Secret One', visibility: 'private', data: { id: 'sec-1', body: 'TOP SECRET' } },
    ]
  },
}

const ctxWith = (manifest) => ({ storage: { read: () => manifest }, content })

const NOW = Date.parse('2026-01-01T00:00:00Z')
const future = new Date(NOW + 1e9).toISOString()
const past = new Date(NOW - 1e9).toISOString()

test('live slug: ids in curated order, and ONLY the private payload in items', async () => {
  const ctx = ctxWith({ good: { items: ['pub-1', 'sec-1'], active: true, expiresAt: future } })
  const { status, body } = await handleLookup(ctx, 'good', NOW)
  assert.equal(status, 200)
  assert.deepEqual(body.ids, ['pub-1', 'sec-1'], 'full curated set, in order')
  assert.equal(body.items.length, 1, 'only the private item travels')
  assert.equal(body.items[0].id, 'sec-1')
  assert.equal(body.items[0].body, 'TOP SECRET')
  assert.ok(!body.items.some((i) => i.id === 'pub-1'), 'public payload is never sent over the wire')
})

test('unknown, deactivated, and expired all return an identical 404', async () => {
  const ctx = ctxWith({
    dead: { items: ['sec-1'], active: false, expiresAt: future },
    gone: { items: ['sec-1'], active: true, expiresAt: past },
  })
  const unknown = await handleLookup(ctx, 'nope', NOW)
  const deactivated = await handleLookup(ctx, 'dead', NOW)
  const expired = await handleLookup(ctx, 'gone', NOW)

  for (const r of [unknown, deactivated, expired]) {
    assert.equal(r.status, 404)
    assert.deepEqual(r.body, { error: 'not_found' })
  }
  // Byte-identical: a visitor cannot distinguish "never existed" from "revoked".
  assert.equal(JSON.stringify(deactivated.body), JSON.stringify(unknown.body))
  assert.equal(JSON.stringify(expired.body), JSON.stringify(unknown.body))
})

test('a 404 never carries content (no private payload leaks via a dead slug)', async () => {
  const ctx = ctxWith({ dead: { items: ['sec-1'], active: false } })
  const { status, body } = await handleLookup(ctx, 'dead', NOW)
  assert.equal(status, 404)
  assert.equal(body.items, undefined, 'no items key at all on a 404')
})

test('orphan ids (content removed since minting) are dropped from a live response', async () => {
  const ctx = ctxWith({ good: { items: ['pub-1', 'ghost', 'sec-1'], active: true, expiresAt: future } })
  const { body } = await handleLookup(ctx, 'good', NOW)
  assert.deepEqual(body.ids, ['pub-1', 'sec-1'], 'unknown "ghost" id is dropped, order preserved')
})

test('an empty slug is treated as not found, never an error', async () => {
  const ctx = ctxWith({ good: { items: ['sec-1'], active: true, expiresAt: future } })
  const { status, body } = await handleLookup(ctx, '', NOW)
  assert.equal(status, 404)
  assert.deepEqual(body, { error: 'not_found' })
})
