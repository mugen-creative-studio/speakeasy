// Deploy verification: after a change is pushed, confirm the live lookup
// endpoint actually reflects it before telling the operator the URL is safe to
// send. This closes the gap between "pushed" and "deployed" - on a static host
// a push triggers a build that takes a minute or two.

// Poll `${prodUrl}${lookupPath}?${param}=<slug>` until its status matches the
// expectation. Matches the EXACT expected status (200 for live, 404 for dead),
// not merely "not 200": a 401 (preview protection without a bypass token) or a
// transient 5xx during redeploy must not be mistaken for the dead 404 a
// deactivate is waiting on.
export function createHttpVerifier({
  prodUrl,
  lookupPath = '/api/variant',
  param = 'slug',
  timeoutMs = 5 * 60 * 1000,
  intervalMs = 5000,
  headers,
} = {}) {
  return {
    async verify(slug, expectLive) {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        try {
          const res = await fetch(`${prodUrl}${lookupPath}?${param}=${encodeURIComponent(slug)}`, {
            cache: 'no-store',
            headers,
          })
          const matches = expectLive ? res.status === 200 : res.status === 404
          if (matches) return true
        } catch {
          // network blip during deploy - keep polling
        }
        await new Promise((r) => setTimeout(r, intervalMs))
      }
      return false
    },
  }
}

// For storage backends where a write is immediately live (fs adapter), there is
// nothing to wait for.
export const noopVerifier = { verify: async () => true }
