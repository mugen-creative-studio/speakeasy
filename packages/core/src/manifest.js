// Pure, dependency-free manifest logic. A manifest is a plain object keyed by
// slug; each entry is { label, items, createdAt, expiresAt, active }.
//
// "items" is the curated, ordered list of content ids this variant reveals.
// For example, items might be case-study ids, document slugs, or photo sets,
// but the schema is deliberately content-neutral so any host can use it.

import { DEFAULT_DURATION_DAYS } from './durations.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Build a fresh manifest entry. `now` is a ms timestamp (injected for testing).
// `durationDays: null` produces a no-expiry entry.
export function buildEntry({ label = '', items = [], durationDays = DEFAULT_DURATION_DAYS, now = Date.now() }) {
  const createdAt = new Date(now).toISOString()
  const expiresAt = durationDays == null ? null : new Date(now + durationDays * MS_PER_DAY).toISOString()
  return { label, items: [...items], createdAt, expiresAt, active: true }
}

// A variant is servable only while it is active and before its expiry. Unknown,
// deactivated, and expired all collapse to "not servable" so the lookup
// endpoint can return one indistinguishable 404 for every dead case - a visitor
// can never detect that a slug ever existed.
export function isServable(entry, now = Date.now()) {
  if (!entry || entry.active !== true) return false
  if (entry.expiresAt == null) return true
  const expiresAt = Date.parse(entry.expiresAt)
  if (Number.isNaN(expiresAt)) return false
  return now < expiresAt
}

// Partition a variant's requested item ids against the set that actually
// exists. Orphans reference content renamed or removed since the variant was
// created; callers drop them so a visitor never sees a silent gap, and the
// dashboard can warn before saving a broken set. Order of the valid ids is
// preserved - the curated sequence is meaningful.
export function partitionItemIds(requestedIds, validIds) {
  const known = validIds instanceof Set ? validIds : new Set(validIds)
  const valid = []
  const orphans = []
  for (const id of Array.isArray(requestedIds) ? requestedIds : []) {
    ;(known.has(id) ? valid : orphans).push(id)
  }
  return { valid, orphans }
}

// Decorate an entry with its lifecycle state for the Manage view.
// `daysLeft` is whole days remaining, floored, never negative; Infinity for a
// no-expiry entry.
export function computeStatus(entry, now = Date.now()) {
  const noExpiry = entry?.expiresAt == null
  const expiresAt = noExpiry ? NaN : Date.parse(entry.expiresAt)
  const expired = !noExpiry && !Number.isNaN(expiresAt) && now >= expiresAt
  let state
  if (entry?.active !== true) state = 'deactivated'
  else if (expired) state = 'expired'
  else state = 'live'
  const daysLeft = noExpiry ? Infinity : Number.isNaN(expiresAt) ? 0 : Math.max(0, Math.floor((expiresAt - now) / MS_PER_DAY))
  return { state, daysLeft }
}
