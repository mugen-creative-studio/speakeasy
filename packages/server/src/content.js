// The content-source seam. This is the single place a host plugs in "what can a
// variant reveal?" — decoupling speakeasy from any particular CMS, data file, or
// project shape.
//
// A content source is an object with one async method:
//
//   items(): Promise<Array<{
//     id: string,                       // stable identifier stored in the manifest
//     title: string,                    // shown in the admin toggle list
//     meta?: string | null,             // optional secondary line (e.g. a company)
//     visibility: 'public' | 'private', // private items' data is server-only
//     data?: unknown,                   // payload returned by lookup for private items
//   }>>
//
// Only `data` for *private* items travels to a visitor (the public catalog is
// assumed to already ship in the client bundle). `data` is omitted from the
// admin list — see toRow.

import { pathToFileURL } from 'node:url'
import path from 'node:path'

// Normalize a content-source spec into an object with items().
// `spec` may be:
//   - an object with an async items() method (used as-is), or
//   - a path to an ESM module whose default export (or a named `content`
//     export) is such an object.
// When given a path, the module is re-imported (cache-busted) on every call, so
// newly added content shows up without restarting the dev server.
export function loadContent(spec, { root = process.cwd() } = {}) {
  if (spec && typeof spec.items === 'function') return spec
  if (typeof spec === 'string') {
    const abs = path.isAbsolute(spec) ? spec : path.join(root, spec)
    return {
      async items() {
        const href = pathToFileURL(abs).href + `?t=${Date.now()}`
        const mod = await import(href)
        const source = mod.default ?? mod.content
        if (!source || typeof source.items !== 'function') {
          throw new Error(`content module "${spec}" must export an object with an items() method`)
        }
        return source.items()
      },
    }
  }
  throw new Error('content source must be an object with items() or a path to a module')
}

// Strip the private payload before sending an item to the browser admin.
export function toRow({ id, title, meta = null, visibility }) {
  return { id, title, meta, visibility }
}
