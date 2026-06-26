// Git-backed storage adapter: the manifest is a committed file, and a change is
// persisted by writing it, committing, and pushing. The deployed site reads the
// manifest from the repo, so a push is the deploy. Pair it with the HTTP verifier
// to confirm the push went live before reporting success.

import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const run = promisify(execFile)

export function createGitStorage({ root = process.cwd(), manifestPath = 'api/_variants.json' } = {}) {
  const abs = path.isAbsolute(manifestPath) ? manifestPath : path.join(root, manifestPath)
  const rel = path.relative(root, abs)

  function read() {
    return JSON.parse(readFileSync(abs, 'utf8'))
  }

  async function persist(manifest, message) {
    // Atomic write (temp + rename) so a crash mid-write can't stage a truncated,
    // unparseable manifest.
    const tmp = abs + '.tmp'
    writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n')
    renameSync(tmp, abs)
    await run('git', ['add', rel], { cwd: root })
    // Skip the commit when nothing actually changed (e.g. re-saving an
    // identical set). `git diff --cached --quiet` exits 0 when nothing is
    // staged, non-zero (throws) when there is - otherwise `git commit` would
    // exit non-zero on an empty diff and the whole call would 500.
    let staged = true
    try {
      await run('git', ['diff', '--cached', '--quiet'], { cwd: root })
      staged = false
    } catch {
      staged = true
    }
    if (staged) await run('git', ['commit', '-m', message], { cwd: root })
    await run('git', ['push'], { cwd: root })
  }

  return { kind: 'git', read, persist }
}
