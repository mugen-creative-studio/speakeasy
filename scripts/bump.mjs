#!/usr/bin/env node
// Bump every publishable package (and the root) to the same version, and
// re-pin the exact internal @speakeasy/* dependencies to match. Internal deps
// are pinned exact on purpose, so a bump has to rewrite them in lockstep or
// installs of the published packages resolve to a version that no longer exists.
//
//   node scripts/bump.mjs <major|minor|patch|x.y.z>
//
// Writes the new version to every package.json, then prints the next steps.
// It does not commit, tag, or publish - that is the release script's job.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const read = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'))

// Root plus every publishable workspace, derived from the `workspaces` field so
// adding or removing a package can never desync this list against reality. The
// demo (and any other private workspace) is intentionally excluded - it never
// gets a version.
const manifests = [
  'package.json',
  ...read('package.json')
    .workspaces.map((w) => join(w, 'package.json'))
    .filter((rel) => !read(rel).private),
]

const arg = process.argv[2]
if (!arg) {
  console.error('usage: node scripts/bump.mjs <major|minor|patch|x.y.z>')
  process.exit(1)
}

function nextVersion(current, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) return bump
  const [major, minor, patch] = current.split('.').map(Number)
  if (bump === 'major') return `${major + 1}.0.0`
  if (bump === 'minor') return `${major}.${minor + 1}.0`
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`
  throw new Error(`unknown bump: ${bump} (use major|minor|patch|x.y.z)`)
}

const current = read('package.json').version
const version = nextVersion(current, arg)

for (const rel of manifests) {
  const pkg = read(rel)
  pkg.version = version
  // Re-pin any internal @speakeasy/* dependency to the new exact version.
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const deps = pkg[field]
    if (!deps) continue
    for (const name of Object.keys(deps)) {
      if (name.startsWith('@speakeasy/')) deps[name] = version
    }
  }
  writeFileSync(join(root, rel), JSON.stringify(pkg, null, 2) + '\n')
  console.log(`  ${rel} -> ${version}`)
}

console.log(`\nBumped ${current} -> ${version}. Next:`)
console.log('  1. Update CHANGELOG.md (move Unreleased into a dated section).')
console.log('  2. npm install            # refresh the lockfile')
console.log(`  3. git commit -am "release: v${version}" && git tag v${version}`)
console.log('  4. git push && git push --tags   # the tag triggers publish')
