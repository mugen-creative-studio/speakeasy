// Production lookup endpoint for the demo (examples/demo), deployed from the
// monorepo root so the workspace packages resolve. In dev the same logic runs
// as a Vite middleware; here it's a serverless function. handleLookup returns a
// plain { status, body }; unknown, deactivated, and expired slugs 404 alike.
//
// The manifest is imported statically so Vercel bundles it. Minting happens
// locally with `git` storage, which commits + pushes a new manifest — that push
// redeploys this function with the updated file.
import { createContext, handleLookup } from '@speakeasy/server'
import content from '../examples/demo/content.js'
import manifest from '../examples/demo/variants.json' with { type: 'json' }

const ctx = createContext({
  content,
  storage: { kind: 'fs', read: () => manifest, persist: async () => {} },
  lookupPath: '/api/variant',
})

export default async function handler(req, res) {
  const slug = new URL(req.url, 'http://localhost').searchParams.get('slug') || ''
  const { status, body } = await handleLookup(ctx, slug)
  res.status(status).json(body)
}
