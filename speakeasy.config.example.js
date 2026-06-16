// Copy to speakeasy.config.js in your project root and edit. Both the Vite
// plugin and the CLI read this one file (via createContext).

export default {
  // Base URL used to render shareable links AND to verify deploys.
  prodUrl: 'https://example.com',

  // Where the slug → entry manifest lives, relative to project root.
  manifestPath: 'api/_variants.json',

  // Your content source: a path to a module (default-exporting { items() }),
  // or an inline object. See examples/content.example.js.
  content: './content.js',

  // 'git'  — manifest is a committed file; persist = write + commit + push,
  //          then poll the live lookup endpoint until the change is reflected.
  // 'fs'   — write the manifest and stop (writable-disk hosts); no verify.
  // Or pass a custom adapter object: { read(), persist(manifest, message) }.
  storage: 'git',

  // Path of the public lookup endpoint on prodUrl, used by the deploy verifier.
  lookupPath: '/api/variant',

  // Commit message for the git adapter.
  commitMessage: 'chore: update variants',

  // Optional verify tuning (git storage only).
  // verifyTimeoutMs: 5 * 60 * 1000,
  // verifyIntervalMs: 5000,
  // verifyHeaders: { 'x-vercel-protection-bypass': process.env.BYPASS_TOKEN },
}
