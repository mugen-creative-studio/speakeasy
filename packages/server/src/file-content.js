// The optional built-in content layout - speakeasy's answer to "let the owner
// flip public/private from the dashboard without moving files by hand."
//
// Projects live as one JSON file per project in a single directory:
//
//   <dir>/<id>.json  ->  { id, title, meta?, visibility, data? }
//     - visibility: 'public' | 'private'
//     - data:       the render payload (summary/body/etc). Present for both;
//                   for a PRIVATE project it only ever travels to a live slug,
//                   for a PUBLIC project it is baked into the public catalog.
//
// Two things are derived from that folder:
//   - createFileContentSource(dir) - the server-side content source (the seam
//     handleLookup reads). Only PRIVATE projects carry `data` out of it, exactly
//     like a hand-written content source.
//   - writePublicCatalog(dir, outFile) - regenerates the browser's public
//     catalog with PUBLIC projects only. The browser imports that file, never
//     the raw folder, so a private project is physically absent from the bundle.
//
// Flipping a project to private = rewrite its file's `visibility` + regenerate
// the public catalog. That is the whole "move to private" mechanism, and it is
// why it is real and not a label: the payload leaves the shipped bundle.

import fs from 'node:fs/promises'
import path from 'node:path'

const CATALOG_BASENAME = 'content.public.json'

function resolveDir(dir, root) {
  return path.isAbsolute(dir) ? dir : path.join(root, dir)
}

// The flat object the client renders, for public and private alike:
// top-level id/title/meta plus the spread render payload.
function renderPayload({ id, title, meta = null, data = {} }) {
  return { id, title, meta, ...data }
}

function assertProject(p, file) {
  if (!p || typeof p !== 'object') throw new Error(`content file "${file}" is not an object`)
  if (typeof p.id !== 'string' || !p.id) throw new Error(`content file "${file}" is missing "id"`)
  if (p.visibility !== 'public' && p.visibility !== 'private') {
    throw new Error(
      `content file "${file}" has invalid visibility "${p.visibility}" (want public|private)`,
    )
  }
}

// Read every project file in the directory, sorted by id for stable output.
// The generated catalog is skipped so a folder can hold both if a host wants.
export async function readProjects(dir, { root = process.cwd() } = {}) {
  const abs = resolveDir(dir, root)
  const entries = await fs.readdir(abs, { withFileTypes: true })
  const projects = []
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.json') || e.name === CATALOG_BASENAME) continue
    const file = path.join(abs, e.name)
    const p = JSON.parse(await fs.readFile(file, 'utf8'))
    assertProject(p, e.name)
    projects.push(p)
  }
  return projects.sort((a, b) => a.id.localeCompare(b.id))
}

// The server-side content source over the folder. Matches the content-source
// contract in content.js: items() returns {id,title,meta,visibility[,data]},
// with `data` present only for private projects.
export function createFileContentSource(dir, { root = process.cwd(), catalogFile } = {}) {
  const abs = resolveDir(dir, root)
  // Where the browser's public catalog is written. Defaults to inside the
  // content dir; hosts point it at a bundled path (e.g. src/content.public.json).
  const catalog = catalogFile
    ? path.isAbsolute(catalogFile)
      ? catalogFile
      : path.join(root, catalogFile)
    : path.join(abs, CATALOG_BASENAME)
  return {
    dir: abs,
    catalogFile: catalog,
    async items() {
      const projects = await readProjects(abs, { root })
      return projects.map((p) => {
        const row = { id: p.id, title: p.title, meta: p.meta ?? null, visibility: p.visibility }
        if (p.visibility === 'private') row.data = renderPayload(p)
        return row
      })
    },
    // The dashboard toggle. Its presence is what tells the admin this source can
    // change visibility (a custom CMS/DB source without it is treated read-only).
    setVisibility(id, visibility) {
      return setProjectVisibility(abs, id, visibility, { root, catalogFile: catalog })
    },
  }
}

// Regenerate the browser's public catalog: PUBLIC projects only, each flattened
// to its render payload. Returns the entries written. This is what makes a
// newly-private project disappear from the next build.
export async function writePublicCatalog(dir, outFile, { root = process.cwd() } = {}) {
  const abs = resolveDir(dir, root)
  const out = path.isAbsolute(outFile) ? outFile : path.join(root, outFile)
  const projects = await readProjects(abs, { root })
  const publicEntries = projects.filter((p) => p.visibility === 'public').map(renderPayload)
  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, JSON.stringify(publicEntries, null, 2) + '\n')
  return publicEntries
}

// Flip one project's visibility in place and regenerate the public catalog so
// the change takes effect in the shipped bundle. Returns the new visibility.
// Throws if the project id is unknown. This is the primitive the admin toggle
// calls; the admin/storage layer decides whether to also commit (git storage).
export async function setProjectVisibility(
  dir,
  id,
  visibility,
  { root = process.cwd(), catalogFile } = {},
) {
  if (visibility !== 'public' && visibility !== 'private') {
    throw new Error(`visibility must be "public" or "private", got "${visibility}"`)
  }
  const abs = resolveDir(dir, root)
  const file = path.join(abs, `${id}.json`)
  let raw
  try {
    raw = await fs.readFile(file, 'utf8')
  } catch {
    throw new Error(`no content file for id "${id}" in ${abs}`)
  }
  const project = JSON.parse(raw)
  assertProject(project, `${id}.json`)
  project.visibility = visibility
  await fs.writeFile(file, JSON.stringify(project, null, 2) + '\n')
  const catalog = catalogFile ?? path.join(abs, CATALOG_BASENAME)
  await writePublicCatalog(abs, catalog, { root })
  // Report the files touched so a git-backed admin can commit + push exactly
  // these (the project file and the regenerated catalog) to deploy the change.
  return { visibility, projectFile: file, catalogFile: catalog }
}

export { CATALOG_BASENAME }
