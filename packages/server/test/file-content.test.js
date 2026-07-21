// The built-in content layout: a directory of per-project JSON files behind a
// content source + a regenerated public catalog. Proves the "move to private"
// mechanism is physical - a private project's payload never reaches the public
// catalog - against a THROWAWAY temp directory. Nothing here touches the repo.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  createFileContentSource,
  writePublicCatalog,
  setProjectVisibility,
  readProjects,
} from '../src/file-content.js'

function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'spk-content-'))
  const write = (id, body) =>
    writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(body, null, 2))
  write('case-alpha', {
    id: 'case-alpha',
    title: 'Alpha',
    meta: 'Acme',
    visibility: 'public',
    data: { summary: 'a summary', body: 'a body' },
  })
  write('case-secret', {
    id: 'case-secret',
    title: 'Secret',
    meta: 'NDA',
    visibility: 'private',
    data: { summary: 'hush', body: 'confidential body' },
  })
  return dir
}

test('content source exposes data only for private projects', async () => {
  const dir = fixture()
  try {
    const items = await createFileContentSource(dir).items()
    const alpha = items.find((i) => i.id === 'case-alpha')
    const secret = items.find((i) => i.id === 'case-secret')
    assert.equal(alpha.visibility, 'public')
    assert.equal(alpha.data, undefined) // public data is not sent by lookup
    assert.equal(secret.visibility, 'private')
    // private data is the flattened render payload the client renders
    assert.deepEqual(secret.data, {
      id: 'case-secret',
      title: 'Secret',
      meta: 'NDA',
      summary: 'hush',
      body: 'confidential body',
    })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('public catalog contains public projects only - private payload never leaks', async () => {
  const dir = fixture()
  const out = path.join(dir, 'content.public.json')
  try {
    const entries = await writePublicCatalog(dir, out)
    assert.equal(entries.length, 1)
    assert.equal(entries[0].id, 'case-alpha')
    const onDisk = readFileSync(out, 'utf8')
    assert.ok(!onDisk.includes('confidential body'), 'private body must not be in the catalog')
    assert.ok(!onDisk.includes('case-secret'), 'private id must not be in the catalog')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('setProjectVisibility flips the file and regenerates the catalog', async () => {
  const dir = fixture()
  const out = path.join(dir, 'content.public.json')
  try {
    await writePublicCatalog(dir, out) // alpha public, secret private
    // flip alpha -> private: it must leave the catalog
    await setProjectVisibility(dir, 'case-alpha', 'private', { catalogFile: out })
    let entries = JSON.parse(readFileSync(out, 'utf8'))
    assert.equal(entries.length, 0, 'alpha should be gone from the public catalog')
    const items = await createFileContentSource(dir).items()
    assert.equal(items.find((i) => i.id === 'case-alpha').visibility, 'private')

    // flip secret -> public: it must appear, now carrying its render payload
    await setProjectVisibility(dir, 'case-secret', 'public', { catalogFile: out })
    entries = JSON.parse(readFileSync(out, 'utf8'))
    assert.equal(entries.length, 1)
    assert.equal(entries[0].id, 'case-secret')
    assert.equal(entries[0].body, 'confidential body')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('setProjectVisibility rejects unknown ids and bad values', async () => {
  const dir = fixture()
  try {
    await assert.rejects(() => setProjectVisibility(dir, 'nope', 'private'), /no content file/)
    await assert.rejects(
      () => setProjectVisibility(dir, 'case-alpha', 'sideways'),
      /visibility must be/,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('readProjects skips the generated catalog and validates files', async () => {
  const dir = fixture()
  try {
    await writePublicCatalog(dir, path.join(dir, 'content.public.json'))
    const projects = await readProjects(dir)
    assert.deepEqual(
      projects.map((p) => p.id),
      ['case-alpha', 'case-secret'],
    )
    // a malformed file is rejected loudly
    writeFileSync(path.join(dir, 'broken.json'), JSON.stringify({ id: 'broken' }))
    await assert.rejects(() => readProjects(dir), /invalid visibility/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
