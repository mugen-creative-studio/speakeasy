import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { speakeasyAdmin } from '@speakeasy/server/vite'
import { createContext, handleLookup, createRateLimiter, clientKey } from '@speakeasy/server'
import config from './speakeasy.config.js'

// The public lookup endpoint, in dev. In production this is a serverless
// function (api/variant.js) - here it's a tiny Vite middleware so the demo
// runs entirely on localhost. Same handler either way: handleLookup returns a
// plain { status, body }, and unknown / deactivated / expired all 404 alike.
function speakeasyLookup({ config }) {
  return {
    name: 'speakeasy-lookup',
    apply: 'serve',
    configureServer(server) {
      const ctx = createContext(config, { root: server.config.root })
      // Throttle the one brute-force surface. `lookupRateLimit: false` disables it.
      const limiter =
        config.lookupRateLimit === false
          ? null
          : createRateLimiter(config.lookupRateLimit || undefined)
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith(config.lookupPath)) return next()
        if (limiter) {
          const { allowed, retryAfterMs } = limiter.hit(clientKey(req))
          if (!allowed) {
            res.statusCode = 429
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)))
            return res.end(JSON.stringify({ error: 'rate_limited' }))
          }
        }
        const slug = new URL(url, 'http://localhost').searchParams.get('slug') || ''
        const { status, body } = await handleLookup(ctx, slug)
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(body))
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    // Dev-only admin API (the dashboard talks to this). Never in a prod build.
    speakeasyAdmin({ config }),
    // The public read-only lookup endpoint.
    speakeasyLookup({ config }),
  ],
})
