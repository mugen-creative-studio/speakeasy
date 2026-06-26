// A tiny, dependency-free fixed-window rate limiter for the public lookup
// endpoint - the one brute-force surface speakeasy exposes (someone scripting
// slug guesses against `lookupPath`). The 62^12 keyspace already makes guessing
// hopeless; this just makes a scripted run die loud and cheap instead of
// quietly hammering your host.
//
// Keyed by client IP, so it is slug-independent: a throttled caller gets a 429
// whether their guess was real or junk. It therefore leaks nothing about which
// slugs exist and preserves the indistinguishable-404 model.
//
// SERVERLESS CAVEAT: the default store lives in process memory, so it only
// counts requests served by one warm instance. On a serverless host (e.g.
// Vercel functions) each cold start is a fresh process and each region its own
// memory, so in-memory limiting is best-effort, not a hard guarantee. For a
// firm limit there, use your platform's edge rate limiting / WAF, or pass a
// `store` backed by a shared service (Vercel KV, Upstash, Redis) implementing
// the same { get, set } shape as createMemoryStore.

const MEMORY_SWEEP_THRESHOLD = 10_000

// In-memory window store. `now` is passed in (never read off the clock here) so
// the limiter stays the single source of time and tests can inject it.
export function createMemoryStore() {
  const map = new Map()
  return {
    get(key, now) {
      const e = map.get(key)
      if (!e) return null
      if (e.expires <= now) {
        map.delete(key)
        return null
      }
      return e.record
    },
    set(key, record, ttlMs, now) {
      // Opportunistic sweep so a flood of distinct IPs can't grow the map without
      // bound - expired windows are dropped once we cross the threshold.
      if (map.size > MEMORY_SWEEP_THRESHOLD) {
        for (const [k, e] of map) if (e.expires <= now) map.delete(k)
      }
      map.set(key, { record, expires: now + ttlMs })
    },
  }
}

export function createRateLimiter({
  limit = 60,
  windowMs = 60_000,
  store = createMemoryStore(),
} = {}) {
  return {
    // Record one hit for `key` and report whether it's within the limit.
    // Returns { allowed, remaining, retryAfterMs }. `now` is injectable for tests.
    hit(key, now = Date.now()) {
      const windowStart = now - (now % windowMs)
      const prev = store.get(key, now)
      const count = (prev && prev.start === windowStart ? prev.count : 0) + 1
      store.set(key, { count, start: windowStart }, windowMs, now)
      const allowed = count <= limit
      return {
        allowed,
        remaining: Math.max(0, limit - count),
        retryAfterMs: allowed ? 0 : windowStart + windowMs - now,
      }
    },
  }
}

// Best-effort client identifier from a Node request. Behind a proxy/CDN (Vercel)
// the real client is the first entry of x-forwarded-for; fall back to the socket
// address for a direct (local dev) connection.
//
// SECURITY: x-forwarded-for is set by the caller and is trivially SPOOFABLE
// unless a trusted proxy in front of you overwrites it (Vercel and Cloudflare
// do). If clients can reach the function directly, an attacker can forge this
// header to rotate "IPs" and slip past the rate limit. On Cloudflare prefer the
// platform's `cf-connecting-ip`; on a raw Node host with no trusted proxy, key
// on the socket address instead. Treat this throttle as best-effort shedding,
// never as a hard guarantee (see the module header).
export function clientKey(req) {
  const xff = req?.headers?.['x-forwarded-for']
  if (xff) return String(xff).split(',')[0].trim()
  return req?.socket?.remoteAddress || req?.connection?.remoteAddress || 'unknown'
}
