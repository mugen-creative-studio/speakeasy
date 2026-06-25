// End-to-end smoke test for the git storage + HTTP verifier path. Exercises the
// real handleCreate / handlePatch flow - manifest write → git commit → git push
// → verify-live polling - against a THROWAWAY git repo (its own bare remote) and
// a local stand-in for the production lookup endpoint. Nothing here touches a
// real remote or live site.

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { handleCreate, handlePatch } from '../src/handlers.js'
import { createGitStorage } from '../src/storage/git.js'
import { createHttpVerifier } from '../src/verify.js'
import { isServable } from '@speakeasy/core'

// A fixed content source covering every id the tests use, all public, so the
// orphan warning stays quiet. (Orphans never block persistence - they're only
// dropped at serve time - but a clean source keeps assertions sharp.)
const content = {
  async items() {
    return ['learning-cloud', 'x', 'y', 'a', 'b'].map((id) => ({ id, title: id, visibility: 'public' }))
  },
}

let work // working repo root (acts like the operator's checkout)
let server
let baseUrl
let ctx

function git(cwd, args) {
  execFileSync('git', args, { cwd, stdio: 'pipe' })
}

function manifest() {
  return JSON.parse(readFileSync(path.join(work, 'api/_variants.json'), 'utf8'))
}

before(async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'speakeasy-smoke-'))
  const remote = path.join(tmp, 'remote.git')
  work = path.join(tmp, 'work')

  git(tmp, ['init', '--bare', '-b', 'main', remote])
  git(tmp, ['clone', remote, work])
  git(work, ['config', 'user.email', 'smoke@test.local'])
  git(work, ['config', 'user.name', 'Smoke Test'])
  mkdirSync(path.join(work, 'api'), { recursive: true })
  writeFileSync(path.join(work, 'api/_variants.json'), '{}\n')
  git(work, ['add', 'api/_variants.json'])
  git(work, ['commit', '-m', 'init'])
  git(work, ['push', '-u', 'origin', 'main'])

  // Local stand-in for the production lookup endpoint: reads the working-tree
  // manifest the handlers write and applies the same isServable rule.
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const slug = url.searchParams.get('slug') || ''
    const m = JSON.parse(readFileSync(path.join(work, 'api/_variants.json'), 'utf8'))
    const ok = isServable(m[slug], Date.now())
    res.statusCode = ok ? 200 : 404
    res.end(JSON.stringify(ok ? { ok: true } : { error: 'not_found' }))
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  baseUrl = `http://127.0.0.1:${server.address().port}`

  ctx = {
    storage: createGitStorage({ root: work, manifestPath: 'api/_variants.json' }),
    verifier: createHttpVerifier({ prodUrl: baseUrl, timeoutMs: 15000, intervalMs: 150 }),
    content,
    prodUrl: baseUrl,
    commitMessage: 'chore: update variants',
  }
})

after(() => {
  server?.close()
  if (work) rmSync(path.join(work, '..'), { recursive: true, force: true })
})

test('create: writes manifest, pushes, verifies live before reporting', async () => {
  const result = await handleCreate(ctx, { label: 'Acme - Smoke', items: ['learning-cloud'], durationDays: 30 })
  assert.equal(result.verified, true, 'should verify the slug is live')
  assert.equal(result.state, 'live')
  assert.deepEqual(result.items, ['learning-cloud'])
  assert.equal(result.url, `${baseUrl}/${result.slug}`)

  const entry = manifest()[result.slug]
  assert.ok(entry, 'manifest has the new entry')
  assert.equal(entry.active, true)

  const status = execFileSync('git', ['status', '--porcelain'], { cwd: work }).toString()
  assert.equal(status.trim(), '', 'no uncommitted changes after push')
})

test('deactivate: kills the slug and verifies it 404s', async () => {
  const created = await handleCreate(ctx, { label: 'Kill me', items: ['x'], durationDays: 30 })
  const patched = await handlePatch(ctx, created.slug, { action: 'deactivate' })
  assert.equal(patched.verified, true, 'verifies the dead 404')
  assert.equal(patched.state, 'deactivated')
  assert.equal(manifest()[created.slug].active, false)
})

test('setDuration: revives an expired slug and re-verifies live', async () => {
  const created = await handleCreate(ctx, { label: 'Expired', items: ['y'], durationDays: 30 })
  const m = manifest()
  m[created.slug].expiresAt = new Date(Date.now() - 1000).toISOString()
  writeFileSync(path.join(work, 'api/_variants.json'), JSON.stringify(m, null, 2) + '\n')
  git(work, ['commit', '-am', 'force expiry'])

  const patched = await handlePatch(ctx, created.slug, { action: 'setDuration', durationDays: 7 })
  assert.equal(patched.verified, true)
  assert.equal(patched.state, 'live')
  assert.ok(isServable(manifest()[created.slug], Date.now()))
})

test('setItems: re-curates the set and stays live', async () => {
  const created = await handleCreate(ctx, { label: 'Recurate', items: ['a'], durationDays: 30 })
  const patched = await handlePatch(ctx, created.slug, { action: 'setItems', items: ['a', 'b'] })
  assert.equal(patched.verified, true)
  assert.deepEqual(patched.items, ['a', 'b'])
  assert.deepEqual(manifest()[created.slug].items, ['a', 'b'])
})

test('setItems: re-saving the identical set is a no-op, not a 500', async () => {
  const created = await handleCreate(ctx, { label: 'Noop', items: ['a', 'b'], durationDays: 30 })
  const patched = await handlePatch(ctx, created.slug, { action: 'setItems', items: ['a', 'b'] })
  assert.equal(patched.verified, true)
  assert.deepEqual(patched.items, ['a', 'b'])
  const status = execFileSync('git', ['status', '--porcelain'], { cwd: work }).toString()
  assert.equal(status.trim(), '', 'working tree clean after a no-op save')
})
