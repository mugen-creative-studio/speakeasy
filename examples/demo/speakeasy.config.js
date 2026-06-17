// Demo config. The same object feeds both the admin dashboard (dev plugin) and
// the public lookup endpoint, so they agree on storage and content.
//
// This demo uses `fs` storage: the manifest is a local JSON file and a write is
// immediately live — no git, no deploy, no remote. That's what makes the demo
// runnable on localhost with zero setup. On a real static host you'd flip
// `storage` to 'git' (push is the deploy) — see INSTALL.md.

export default {
  // Localhost in the demo; your real domain in production.
  prodUrl: 'http://localhost:5173',

  // Where the slug → variant manifest lives (created on first write).
  manifestPath: 'variants.json',

  // The content source above.
  content: './content.js',

  // 'fs' — write the manifest and stop; the lookup endpoint reads it directly.
  storage: 'fs',

  // The public endpoint the visitor's slug resolves against.
  lookupPath: '/api/variant',
}
