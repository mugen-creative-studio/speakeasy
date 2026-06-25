// Production lookup endpoint for the demo (examples/demo), deployed from the
// monorepo root so the workspace packages resolve. In dev the same logic runs
// as a Vite middleware; here it's a serverless function. handleLookup returns a
// plain { status, body }; unknown, deactivated, and expired slugs 404 alike.
//
// The manifest is imported statically so Vercel bundles it. Minting happens
// locally with `git` storage, which commits + pushes a new manifest - that push
// redeploys this function with the updated file.
import { createContext, handleLookup, createRateLimiter, clientKey } from '@speakeasy/server'
import content from '../examples/demo/content.js'
import manifest from '../examples/demo/variants.json' with { type: 'json' }

const ctx = createContext({
  content,
  storage: { kind: 'fs', read: () => manifest, persist: async () => {} },
  lookupPath: '/api/variant',
})

// Best-effort throttle on slug-guessing. NOTE: in-memory only limits within one
// warm serverless instance (see rate-limit.js) - fine to shed a naive script,
// but for a hard guarantee front this with Vercel's WAF/edge rate limiting or a
// KV-backed store. It stays slug-independent, so it never reveals a live slug.
const limiter = createRateLimiter()

export default async function handler(req, res) {
  const { allowed, retryAfterMs } = limiter.hit(clientKey(req))
  if (!allowed) {
    res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)))
    return res.status(429).json({ error: 'rate_limited' })
  }
  const slug = new URL(req.url, 'http://localhost').searchParams.get('slug') || ''
  const { status, body } = await handleLookup(ctx, slug)
  res.status(status).json(body)
}
