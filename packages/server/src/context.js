// Wire a plain config object into a ctx the handlers can use. Both the Vite
// plugin and the CLI go through here so a host writes its setup once (in
// speakeasy.config.js) and every entry point agrees.

import { loadContent } from './content.js'
import { createGitStorage } from './storage/git.js'
import { createFsStorage } from './storage/fs.js'
import { createHttpVerifier, noopVerifier } from './verify.js'

export function createContext(config, { root = process.cwd() } = {}) {
  const {
    prodUrl,
    manifestPath = 'api/_variants.json',
    content,
    storage = 'git',
    commitMessage = 'chore: update variants',
    lookupPath = '/api/variant',
    verifyTimeoutMs,
    verifyIntervalMs,
    verifyHeaders,
    verifier: verifierOverride,
  } = config

  // storage: a ready-made adapter object, or 'git' | 'fs' to build a default.
  const store =
    storage && typeof storage.read === 'function'
      ? storage
      : storage === 'fs'
        ? createFsStorage({ root, manifestPath })
        : createGitStorage({ root, manifestPath })

  // verifier: an override, else noop for fs (writes are immediately live),
  // else an HTTP poller against the live lookup endpoint.
  const verifier =
    verifierOverride ??
    (store.kind === 'fs'
      ? noopVerifier
      : createHttpVerifier({
          prodUrl,
          lookupPath,
          timeoutMs: verifyTimeoutMs,
          intervalMs: verifyIntervalMs,
          headers: verifyHeaders,
        }))

  return {
    storage: store,
    verifier,
    content: loadContent(content, { root }),
    prodUrl,
    commitMessage,
  }
}
