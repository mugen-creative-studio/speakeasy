// Node-only: uses node:crypto for cryptographically strong randomness. The rest
// of core is isomorphic, but slug generation always runs server-side (in the
// admin server or CLI), never in the browser, so the node dependency is fine.

import { randomBytes } from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const SLUG_LENGTH = 12

// base62 slug, rejection-sampled to avoid modulo bias (248 = 4 * 62). The
// 12-char default gives 62^12 ≈ 3.2e21 possibilities - unguessable in practice.
export function generateSlug(length = SLUG_LENGTH) {
  const out = []
  while (out.length < length) {
    const bytes = randomBytes(length)
    for (let i = 0; i < bytes.length && out.length < length; i++) {
      const b = bytes[i]
      if (b < 248) out.push(ALPHABET[b % ALPHABET.length])
    }
  }
  return out.join('')
}
