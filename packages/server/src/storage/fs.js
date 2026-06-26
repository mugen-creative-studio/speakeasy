// Plain-filesystem storage adapter: write the manifest and stop. No git, no
// deploy. Use this when the manifest lives on a server with a writable disk (a
// long-running Node host, a database-backed setup wrapped to look like this),
// or for local development against a manifest that some other process serves.
// Pair it with noopVerifier - there is no separate deploy to wait for.

import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import path from 'node:path'

export function createFsStorage({ root = process.cwd(), manifestPath = 'variants.json' } = {}) {
  const abs = path.isAbsolute(manifestPath) ? manifestPath : path.join(root, manifestPath)

  return {
    kind: 'fs',
    read() {
      try {
        return JSON.parse(readFileSync(abs, 'utf8'))
      } catch {
        return {}
      }
    },
    async persist(manifest) {
      // Atomic write: a crash mid-write must not leave a truncated, unparseable
      // manifest (which read() would then swallow as {}, silently dropping every
      // live slug). Write to a temp file, then rename, which is atomic on the
      // same filesystem.
      const tmp = abs + '.tmp'
      writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n')
      renameSync(tmp, abs)
    },
  }
}
