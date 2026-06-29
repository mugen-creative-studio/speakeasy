import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildEntry,
  isServable,
  partitionItemIds,
  computeStatus,
  generateSlug,
} from '../src/index.js'

const NOW = Date.parse('2026-01-01T00:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

test('generateSlug: 12-char base62 by default, no bias artifacts', () => {
  const slug = generateSlug()
  assert.equal(slug.length, 12)
  assert.match(slug, /^[A-Za-z0-9]{12}$/)
  assert.notEqual(generateSlug(), generateSlug())
})

test('buildEntry: active, ordered items, computed expiry', () => {
  const entry = buildEntry({ label: 'Acme', items: ['b', 'a'], durationDays: 30, now: NOW })
  assert.equal(entry.active, true)
  assert.deepEqual(entry.items, ['b', 'a'])
  assert.equal(entry.createdAt, new Date(NOW).toISOString())
  assert.equal(entry.expiresAt, new Date(NOW + 30 * DAY).toISOString())
})

test('buildEntry: durationDays null means no expiry', () => {
  const entry = buildEntry({ items: [], durationDays: null, now: NOW })
  assert.equal(entry.expiresAt, null)
})

test('isServable: active + unexpired only', () => {
  assert.equal(isServable(buildEntry({ durationDays: 1, now: NOW }), NOW), true)
  assert.equal(isServable(buildEntry({ durationDays: 1, now: NOW }), NOW + 2 * DAY), false)
  assert.equal(isServable({ active: false, expiresAt: null }, NOW), false)
  assert.equal(isServable(null, NOW), false)
  assert.equal(isServable(buildEntry({ durationDays: null, now: NOW }), NOW + 9e9), true)
})

test('partitionItemIds: preserves order, separates orphans', () => {
  const { valid, orphans } = partitionItemIds(['a', 'x', 'b'], new Set(['a', 'b', 'c']))
  assert.deepEqual(valid, ['a', 'b'])
  assert.deepEqual(orphans, ['x'])
})

test('computeStatus: live / expired / deactivated + daysLeft', () => {
  assert.deepEqual(computeStatus(buildEntry({ durationDays: 10, now: NOW }), NOW), {
    state: 'live',
    daysLeft: 10,
  })
  assert.equal(
    computeStatus(buildEntry({ durationDays: 1, now: NOW }), NOW + 2 * DAY).state,
    'expired',
  )
  assert.equal(computeStatus({ active: false, expiresAt: null }, NOW).state, 'deactivated')
  assert.equal(computeStatus(buildEntry({ durationDays: null, now: NOW }), NOW).daysLeft, Infinity)
})
