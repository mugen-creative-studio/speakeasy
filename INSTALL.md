# Installing speakeasy

This guide is written for the **coding agent** (or developer) wiring speakeasy
into a site. The site owner hands you their repo and this file, and you do the
integration. The end state: the owner can create a secret link from a local
dashboard, hand it to whoever they choose, and revoke it. There is no admin surface in
production, and no private data reaches the deployed site until a live slug asks
for it.

A complete, runnable reference lives in [`examples/demo`](examples/demo). It
wires every seam below with the `fs` adapter on localhost. **Read it first and
mirror its structure**; it is the canonical example this guide describes.

---

## 0. Can this site use speakeasy?

speakeasy needs three things from the host. Confirm all three before starting:

1. **A server-side endpoint you can deploy:** somewhere to run `handleLookup` at
   request time (a serverless or edge function, or any Node route).
2. **Routing control:** the ability to route an arbitrary top-level `/<slug>` to
   the app, and to expose the lookup endpoint at a fixed path.
3. **Your own client code:** the app can read the slug, call the endpoint, and
   render the result.

✅ Coded sites on Vercel, Netlify, Cloudflare, or self-hosted Node.
⚠️ Webflow **Cloud** (Cloudflare Workers) and Wix **Velo** are possible, but you
reimplement the server seam on their runtime using `@speakeasy/core`.
❌ No-code Squarespace, Wix, or classic Webflow have no custom backend, so they
are not possible.

---

## 1. Install

Requires **Node 20 or newer** on the machine that runs the CLI or the dev
dashboard (every package sets `engines.node >= 20`).

```bash
npm install @speakeasy/core @speakeasy/server @speakeasy/cli @speakeasy/admin
```

`@speakeasy/admin` is only needed if you mount the React dashboard (step 5a),
which requires `react` and `react-dom` (>=18) as peer dependencies in your
project. The CLI (step 5b) is an alternative that needs neither React nor a dev
plugin.

## 2. Config - `speakeasy.config.js`

One file feeds the Vite plugin, the CLI, and the lookup endpoint. See
[`speakeasy.config.example.js`](speakeasy.config.example.js).

```js
export default {
  prodUrl: 'https://yoursite.com',     // renders share links AND verifies deploys
  manifestPath: 'api/_variants.json',  // where the slug→entry manifest lives
  content: './content.js',             // the content source (step 3)
  storage: 'git',                      // 'git' | 'fs' | custom adapter (step 4)
  lookupPath: '/api/variant',          // public endpoint path on prodUrl
}
```

## 3. Content source - what a variant can reveal

The single decoupling seam. Implement `items()`, returning every item the admin
can toggle. See [`examples/content.example.js`](examples/content.example.js) and
the demo's [`content.js`](examples/demo/content.js).

```js
// content.js
export default {
  async items() {
    return [
      // PUBLIC items already ship in the client bundle → no `data` needed.
      // `title` is the row's label in the admin; `meta` is an optional second line.
      { id: 'about', title: 'About', meta: 'Studio', visibility: 'public' },
      // PRIVATE items live server-only. `data` is what the lookup endpoint
      // returns to a visitor holding a live slug that includes this id.
      { id: 'case-secret', title: 'Confidential', meta: 'Acme · under NDA',
        visibility: 'private', data: { /* the full payload the client renders */ } },
    ]
  },
}
```

Each item is `{ id, title, meta?, visibility, data? }`. `title` labels the row in the
admin (and the variant view); `meta` is an optional secondary line (e.g. a company or
status); `data` is the private payload sent only to a live slug that includes the item.

Key model: **public content is assumed to already be in your client bundle**, so
only *private* `data` travels over the wire, and only when a live slug requests
it. If your site fetches all content per request (no public catalog in the
bundle), rethink what "public versus private" means for you before proceeding.

## 4. Storage adapter - how the manifest persists

- **`git`:** the manifest is a committed file. `persist` writes, commits, and
  pushes, so the push is the deploy. Pair it with the HTTP verifier (default),
  which polls `prodUrl + lookupPath` until the change is live. Use this on static
  hosts (Vercel, Netlify, Cloudflare Pages). **Prerequisites:** `git` installed
  on the operator's machine, and the manifest repo checked out with a remote, an
  upstream-tracked branch, and working push credentials. `persist` runs a bare
  `git push`; if it cannot push, the mint/revoke fails.
- **`fs`:** write the manifest and stop. For a long-running Node host with a
  writable disk, or for local dev. Verification is a no-op.
- **Custom:** pass `storage: { read(), persist(manifest, message), kind }` to
  back it with a KV store, S3, a database, or a constrained runtime (Wix Velo).

> **Public-repo footgun (`git` storage).** The committed manifest lists every
> slug and label in plain text. If the repository holding it is **public**,
> anyone can read them straight from source and bypass the unguessable-URL model
> entirely. The repo holding the manifest (and your private content source) must
> be **private**, or the manifest must live outside any public repo. See the
> audit checklist below.

## 5. The admin (operator-only, never deployed)

**a) Dashboard.** The dashboard is React and mounts through a **Vite dev-server
plugin**, so this path needs a Vite-based project with `react` + `react-dom`
(>=18, peer dependencies the admin does not bundle) and `vite` +
`@vitejs/plugin-react` already installed. If your host is not React + Vite (for
example Next.js or a webpack app), do not add them just for this, use the CLI
(5b) instead. Mount the dev-only plugin and a dev-only `/admin` route:

```js
// vite.config.js
import { speakeasyAdmin } from '@speakeasy/server/vite'
import config from './speakeasy.config.js'
export default defineConfig({ plugins: [react(), speakeasyAdmin({ config })] })
```

```jsx
// a dev-only /admin route
import { AdminApp } from '@speakeasy/admin'
import '@speakeasy/admin/admin.css'
export default () => <AdminApp />
```

The plugin is `apply: 'serve'`, so it exists only in the dev server and never in
a production build. That is the whole security model: **the operator keeps the
admin secret by not deploying it.**

**b) Or the CLI.** No UI, no dev plugin. JSON output by default (agent-friendly):

```bash
speakeasy create --label "Acme - Spring" --items about,case-secret --duration 30
speakeasy list
speakeasy deactivate <slug>
```

## 6. The lookup endpoint (the one thing you deploy)

A read-only function at `lookupPath`. Build a read-only `fs` context and return
`handleLookup`'s `{ status, body }`:

```js
// api/variant.js  (Vercel-style serverless function)
import { createContext, handleLookup } from '@speakeasy/server'
import config from '../speakeasy.config.js'
const ctx = createContext({ ...config, storage: 'fs' }) // never persists in prod
export default async function (req, res) {
  const { status, body } = await handleLookup(ctx, req.query.slug)
  res.status(status).json(body)
}
```

Unknown, deactivated, and expired slugs all return the **same 404**, so a visitor
cannot detect that a slug ever existed. A live slug returns `{ ids, items }`:
`ids` is the full curated set in order, and `items` carries only the private
payloads.

**Optional hardening: rate-limit the endpoint.** This is the one surface a slug
guesser can script against. The `62^12` keyspace already makes brute force
hopeless, but throttling makes a scripted run die loud and cheap. Wrap the
handler with the built-in limiter (keyed by client IP, so it is slug-independent
and leaks nothing about which slugs exist, since a throttled caller gets `429`
whether the guess was real or junk):

```js
import { handleLookup, createRateLimiter, clientKey } from '@speakeasy/server'
const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 }) // module scope
export default async function (req, res) {
  const { allowed, retryAfterMs } = limiter.hit(clientKey(req))
  if (!allowed) {
    res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)))
    return res.status(429).json({ error: 'rate_limited' })
  }
  const { status, body } = await handleLookup(ctx, req.query.slug)
  res.status(status).json(body)
}
```

> **Serverless caveat:** the default in-memory store only counts within one warm
> instance. Across cold starts and regions, bursts slip through, so it is
> best-effort shedding, not a hard cap. For a firm limit on a serverless host,
> use your platform's edge rate limiting or WAF, or pass a `store` backed by a
> shared service (Vercel KV, Upstash, Redis). On a long-lived server (Express)
> the in-memory default is already a real limit.

## 7. Host rewrite - route `/<slug>` to the app

Each platform differs. Recipes (Vercel, Netlify, Cloudflare, nginx) are in
[`docs/host-rewrites.md`](docs/host-rewrites.md). Two things must be true: the
lookup endpoint is reachable at `prodUrl + lookupPath`, and `/<slug>` falls
through to your SPA so client routing can read the slug.

## 8. The visitor view - render the variant, or an identical dead end

In the app, when the path is a slug, call the endpoint and render the curated
set. Mirror the demo's [`App.jsx`](examples/demo/src/App.jsx):

```js
const res = await fetch(`/api/variant?slug=${slug}`, { cache: 'no-store' })
if (res.status !== 200) renderNotFound()        // see the warning below
else {
  const { ids, items } = await res.json()
  const privateById = new Map(items.map((i) => [i.id, i]))
  const ordered = ids.map((id) => publicCatalog[id] ?? privateById.get(id))
  render(ordered)                                // ids order is meaningful
}
```

> **Critical:** the indistinguishable-404 guarantee is **your** responsibility
> here, not the library's. With an SPA fallback every path returns `index.html`
> (HTTP 200), so the *page* always loads. Your "not found" view for a dead slug
> must be **byte-identical** to what any junk URL renders. If your real 404 page
> looks different, you leak that a slug once existed.

---

## Verification checklist (also the audit checklist)

Run these after wiring it up, and any time a technical reviewer audits the deploy:

- [ ] **No private data in the public bundle.** Grep the built client output for
      a known private payload string. It must be **absent**. Private `data`
      should appear only in a live lookup response.
- [ ] **No admin in production.** The deployed site exposes only `lookupPath`.
      The Vite plugin is `apply: 'serve'`; there is no `/admin` route or
      `/__speakeasy` API in the production build.
- [ ] **Dead slugs are indistinguishable.** A deactivated, expired, unknown, and
      garbage path all return the identical 404 from the endpoint *and* render
      the identical "not found" view in the client.
- [ ] **Deploy verifies before reporting live.** With `git` storage, the
      dashboard or CLI reports success only after the HTTP verifier confirms the
      change is live (or warns that it could not verify before timeout).
- [ ] **The manifest repo is private (`git` storage).** The committed manifest
      exposes every slug and label to anyone who can read the repository. The
      repo holding it (and the private content source) must be **private**, or
      the manifest must live outside any public repo. A public repo defeats the
      whole obscurity model.
- [ ] **Lookup endpoint is throttled.** The lookup wraps `createRateLimiter`
      (or platform edge rate limiting or a WAF on a serverless host). A burst of
      misses from one client gets `429`s, and the throttle is slug-independent,
      so it never reveals a live slug.

## Not the right tool when

- The secret needs real access control, an audit trail, or per-identity
  revocation. speakeasy is **obscurity + curation + lifecycle, not auth**, and
  URLs leak via history, `Referer`, and logs.
- The host cannot run any endpoint (pure static, no functions).
- You need millions of per-user pages. This is one JSON manifest, one operator.
