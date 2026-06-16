// The framework-agnostic request handlers. Every handler takes a `ctx`:
//
//   {
//     storage,        // { read(): manifest, persist(manifest, message): Promise }
//     verifier,       // { verify(slug, expectLive): Promise<boolean> }
//     content,        // { items(): Promise<Array<item>> }  (see content.js)
//     prodUrl,        // base URL used to render shareable variant links
//     commitMessage,  // message passed to storage.persist
//   }
//
// Build a ctx by hand or with createContext(config) from ./context.js. The
// handlers know nothing about HTTP, git, or any host — that all lives behind the
// adapters, which is what makes the whole thing portable.

import {
  buildEntry,
  isServable,
  computeStatus,
  generateSlug,
  partitionItemIds,
  DEFAULT_DURATION_DAYS,
} from '@speakeasy/core'
import { toRow } from './content.js'

function decorate(ctx, slug, entry) {
  const status = computeStatus(entry, Date.now())
  return {
    slug,
    label: entry.label ?? '',
    items: entry.items ?? [],
    createdAt: entry.createdAt ?? null,
    expiresAt: entry.expiresAt ?? null,
    active: entry.active === true,
    state: status.state,
    daysLeft: status.daysLeft,
    url: `${ctx.prodUrl}/${slug}`,
  }
}

async function knownIds(ctx) {
  const items = await ctx.content.items()
  return new Set(items.map((i) => i.id))
}

// Non-blocking: surface selected ids that don't resolve to real content so the
// dashboard can warn before a broken variant goes live. Degrades to [] when the
// content source can't be loaded, so persistence never depends on it.
async function findOrphans(ctx, ids) {
  try {
    return partitionItemIds(ids, await knownIds(ctx)).orphans
  } catch {
    return []
  }
}

async function persistAndVerify(ctx, { slug, manifest, entry }) {
  await ctx.storage.persist(manifest, ctx.commitMessage ?? 'chore: update variants')
  return ctx.verifier.verify(slug, isServable(entry, Date.now()))
}

// GET — the toggle list for the admin Create/Edit views.
export async function handleListItems(ctx) {
  const items = await ctx.content.items()
  return { items: items.map(toRow) }
}

// GET — every variant, decorated with lifecycle state for the Manage view.
export async function handleListVariants(ctx) {
  const manifest = await ctx.storage.read()
  return { variants: Object.entries(manifest).map(([slug, entry]) => decorate(ctx, slug, entry)) }
}

// POST — mint a new slug, persist, and verify it went live.
export async function handleCreate(ctx, body) {
  const { label = '', items = [], durationDays = DEFAULT_DURATION_DAYS } = body
  const orphans = await findOrphans(ctx, items)
  const slug = generateSlug()
  const manifest = await ctx.storage.read()
  const entry = buildEntry({ label, items, durationDays })
  manifest[slug] = entry
  const verified = await persistAndVerify(ctx, { slug, manifest, entry })
  return { ...decorate(ctx, slug, entry), verified, orphans }
}

// PATCH — deactivate, re-base the expiry, or re-curate the item set.
export async function handlePatch(ctx, slug, body) {
  const manifest = await ctx.storage.read()
  const entry = manifest[slug]
  if (!entry) return { error: 'not_found' }

  const { action } = body
  let orphans = []
  if (action === 'deactivate') {
    entry.active = false
  } else if (action === 'setDuration') {
    // Re-base the death date from now using the chosen duration, and revive the
    // variant so "change expiry" on an expired one brings it back.
    const next = buildEntry({
      label: entry.label,
      items: entry.items,
      durationDays: body.durationDays === undefined ? DEFAULT_DURATION_DAYS : body.durationDays,
    })
    entry.expiresAt = next.expiresAt
    entry.active = true
  } else if (action === 'setItems') {
    entry.items = Array.isArray(body.items) ? body.items : entry.items
    orphans = await findOrphans(ctx, entry.items)
  } else {
    return { error: 'bad_action' }
  }

  manifest[slug] = entry
  const verified = await persistAndVerify(ctx, { slug, manifest, entry })
  return { ...decorate(ctx, slug, entry), verified, orphans }
}

// The public lookup — the production endpoint a visitor's slug request hits.
// Returns a plain { status, body } so any host (serverless function, Express
// route) can map it onto its own response object. Unknown, deactivated, and
// expired all return the same 404 so no one can detect a slug ever existed.
export async function handleLookup(ctx, slug, now = Date.now()) {
  const manifest = await ctx.storage.read()
  const entry = slug ? manifest[slug] : null
  if (!isServable(entry, now)) {
    return { status: 404, body: { error: 'not_found' } }
  }

  const all = await ctx.content.items()
  const known = new Set(all.map((i) => i.id))
  const { valid: ids, orphans } = partitionItemIds(entry.items, known)
  if (orphans.length) {
    console.warn(`[speakeasy] "${entry.label || 'unlabeled'}" references unknown ids: ${orphans.join(', ')}`)
  }

  // Only private items' data needs to travel — the public catalog already ships
  // in the client. `ids` carries the full curated set (public + private) so the
  // client can render exactly that set, in order, hiding public items this
  // variant chose to omit.
  const items = all
    .filter((i) => i.visibility === 'private' && ids.includes(i.id))
    .map((i) => i.data ?? { id: i.id })

  return { status: 200, body: { ids, items } }
}
