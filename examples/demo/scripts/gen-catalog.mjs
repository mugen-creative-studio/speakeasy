// Regenerate the browser's public catalog (src/content.public.json) from the
// built-in content layout in ./content. Runs before dev and build so a fresh
// checkout always has an up-to-date, PUBLIC-only catalog. The admin toggle also
// calls this same generator (via @speakeasy/server) whenever a project's
// visibility changes, so private projects never linger in the shipped bundle.

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { writePublicCatalog } from '@speakeasy/server'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')

const entries = await writePublicCatalog(
  path.join(root, 'content'),
  path.join(root, 'src/content.public.json'),
)
console.log(`[demo] regenerated src/content.public.json (${entries.length} public projects)`)
