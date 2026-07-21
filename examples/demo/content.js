// The content source - speakeasy's content seam. It answers one question:
// "what can a variant reveal?" It runs server-side only (in the dev plugin /
// the lookup endpoint), so this is the safe place for confidential payloads.
//
// This demo uses speakeasy's OPTIONAL built-in content layout: every project is
// a JSON file in ./content, each carrying a `visibility` field. The admin's
// public/private toggle flips that field and regenerates src/content.public.json
// (the browser's public catalog), so making a project private physically drops
// it from the shipped bundle - no hand-moving files. See SPK-17.
//
//   - PUBLIC projects are baked into src/content.public.json and ship in the
//     browser bundle, so lookup never re-sends their data.
//   - PRIVATE projects live ONLY here on the server. Their data travels to a
//     visitor holding a live slug, and never appears in the public bundle.

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createFileContentSource } from '@speakeasy/server'

const here = path.dirname(fileURLToPath(import.meta.url))

// The admin toggle regenerates the browser's public catalog at this bundled
// path, so a public/private change is reflected on the next dev reload / build.
export default createFileContentSource(path.join(here, 'content'), {
  catalogFile: path.join(here, 'src/content.public.json'),
})
