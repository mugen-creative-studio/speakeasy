// handleSetVisibility across the two storage modes and the read-only fallback.
// fs mode just rewrites files; git mode also commits + pushes the content layout
// to a THROWAWAY bare repo. Nothing here touches a real remote.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { handleSetVisibility } from '../src/handlers.js'
import { createFileContentSource } from '../src/file-content.js'
import { createFsStorage } from '../src/storage/fs.js'
import { createGitStorage } from '../src/storage/git.js'

function git(cwd, args) {
  execFileSync('git', args, { cwd, stdio: 'pipe' })
}

function seedContent(dir) {
  writeFileSync(
    path.join(dir, 'a.json'),
    JSON.stringify({ id: 'a', title: 'A', visibility: 'public', data: { body: 'shown' } }),
  )
  writeFileSync(
    path.join(dir, 'secret.json'),
    JSON.stringify({
      id: 'secret',
      title: 'Secret',
      visibility: 'private',
      data: { body: 'hush' },
    }),
  )
}

test('fs storage: flipping a project rewrites files, no push', async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'spk-vis-fs-'))
  try {
    const contentDir = path.join(tmp, 'content')
    mkdirSync(contentDir)
    seedContent(contentDir)
    const catalog = path.join(tmp, 'content.public.json')
    const ctx = {
      storage: createFsStorage({ root: tmp, manifestPath: 'variants.json' }),
      content: createFileContentSource(contentDir, { catalogFile: catalog }),
    }

    const r = await handleSetVisibility(ctx, 'a', 'private')
    assert.deepEqual(r, { id: 'a', visibility: 'private', pushed: false })
    // catalog now empty (both projects private)
    assert.deepEqual(JSON.parse(readFileSync(catalog, 'utf8')), [])

    const back = await handleSetVisibility(ctx, 'secret', 'public')
    assert.equal(back.visibility, 'public')
    const entries = JSON.parse(readFileSync(catalog, 'utf8'))
    assert.deepEqual(
      entries.map((e) => e.id),
      ['secret'],
    )
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('read-only content source is reported, not thrown', async () => {
  const ctx = {
    storage: createFsStorage({ root: tmpdir(), manifestPath: 'nope.json' }),
    content: {
      async items() {
        return [{ id: 'a', title: 'A', visibility: 'public' }]
      },
    },
  }
  assert.deepEqual(await handleSetVisibility(ctx, 'a', 'private'), { error: 'read_only' })
})

test('bad visibility and unknown id are rejected', async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'spk-vis-err-'))
  try {
    const contentDir = path.join(tmp, 'content')
    mkdirSync(contentDir)
    seedContent(contentDir)
    const ctx = {
      storage: createFsStorage({ root: tmp, manifestPath: 'variants.json' }),
      content: createFileContentSource(contentDir, {
        catalogFile: path.join(tmp, 'content.public.json'),
      }),
    }
    assert.deepEqual(await handleSetVisibility(ctx, 'a', 'sideways'), { error: 'bad_visibility' })
    assert.deepEqual(await handleSetVisibility(ctx, 'ghost', 'private'), { error: 'not_found' })
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('git storage: flipping a project commits + pushes the content files', async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'spk-vis-git-'))
  try {
    const remote = path.join(tmp, 'remote.git')
    const work = path.join(tmp, 'work')
    git(tmp, ['init', '--bare', '-b', 'main', remote])
    git(tmp, ['clone', remote, work])
    git(work, ['config', 'user.email', 'vis@test.local'])
    git(work, ['config', 'user.name', 'Vis Test'])
    const contentDir = path.join(work, 'content')
    mkdirSync(contentDir)
    seedContent(contentDir)
    mkdirSync(path.join(work, 'api'), { recursive: true })
    writeFileSync(path.join(work, 'api/_variants.json'), '{}\n')
    git(work, ['add', '.'])
    git(work, ['commit', '-m', 'init'])
    git(work, ['push', '-u', 'origin', 'main'])

    const ctx = {
      storage: createGitStorage({ root: work, manifestPath: 'api/_variants.json' }),
      content: createFileContentSource(contentDir, {
        root: work,
        catalogFile: path.join(work, 'src/content.public.json'),
      }),
      commitMessage: 'chore: visibility',
    }

    const r = await handleSetVisibility(ctx, 'secret', 'public')
    assert.equal(r.pushed, true)

    // the remote received the commit, and it carries both changed files
    const log = execFileSync('git', ['log', '--name-only', '-1', 'main'], {
      cwd: remote,
      encoding: 'utf8',
    })
    assert.match(log, /content\/secret\.json/)
    assert.match(log, /src\/content\.public\.json/)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('loadContent forwards setVisibility to a file-backed module', async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'spk-vis-load-'))
  try {
    const contentDir = path.join(tmp, 'content')
    mkdirSync(contentDir)
    seedContent(contentDir)
    // a module that re-exports a file content source, like the demo's content.js
    const mod = path.join(tmp, 'content.js')
    writeFileSync(
      mod,
      `import { createFileContentSource } from '${new URL('../src/file-content.js', import.meta.url).pathname}'\n` +
        `export default createFileContentSource('${contentDir}', { catalogFile: '${path.join(tmp, 'content.public.json')}' })\n`,
    )
    const { loadContent } = await import('../src/content.js')
    const source = loadContent(mod)
    const change = await source.setVisibility('secret', 'public')
    assert.equal(change.visibility, 'public')
    const entries = JSON.parse(readFileSync(path.join(tmp, 'content.public.json'), 'utf8'))
    assert.ok(entries.some((e) => e.id === 'secret'))
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})

test('loadContent reports READ_ONLY for a module without setVisibility', async () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'spk-vis-ro-'))
  try {
    const mod = path.join(tmp, 'plain.js')
    writeFileSync(mod, `export default { async items() { return [] } }\n`)
    const { loadContent } = await import('../src/content.js')
    const source = loadContent(mod)
    await assert.rejects(
      () => source.setVisibility('x', 'private'),
      (e) => e.code === 'READ_ONLY',
    )
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
})
