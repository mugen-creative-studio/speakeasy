# Installing speakeasy

This guide is written for the **coding agent** (or developer) wiring speakeasy
into a site. The site owner hands you their repo and this file; you do the
integration. The end state: the owner can mint a secret URL from a local
dashboard, hand it to one person, and revoke it — with no admin surface and no
private data on the deployed site until a live slug asks for it.

A complete, runnable reference lives in [`examples/demo`](examples/demo). It
wires every seam below with the `fs` adapter on localhost. **Read it first and
mirror its structure** — it is the canonical example this guide describes.

---

## 0. Can this site use speakeasy?

speakeasy needs three things from the host. Confirm all three before starting:

1. **A server-side endpoint** you can deploy — somewhere to run `handleLookup`
   at request time (a serverless/edge function, or any Node route).
2. **Routing control** — the ability to route an arbitrary top-level
   `/<slug>` to the app, and to expose the lookup endpoint at a fixed path.
3. **Your own client code** — the app can read the slug, call the endpoint, and
   render the result.

✅ Coded sites on Vercel / Netlify / Cloudflare / self-hosted Node.
⚠️ Webflow **Cloud** (Cloudflare Workers) and Wix **Velo** — possible, but you
reimplement the server seam on their runtime using `@speakeasy/core`.
❌ No-code Squarespace / Wix / classic Webflow — no custom backend; not possible.

---

## 1. Install

```bash
npm install @speakeasy/core @speakeasy/server @speakeasy/cli @speakeasy/admin
```

`@speakeasy/admin` is only needed if you mount the React dashboard (step 5a);
the CLI (step 5b) is an alternative that needs neither React nor a dev plugin.

## 2. Config — `speakeasy.config.js`

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

## 3. Content source — what a variant can reveal

The single decoupling seam. Implement `items()` returning every item the admin
can toggle. See [`examples/content.example.js`](examples/content.example.js) and
the demo's [`content.js`](examples/demo/content.js).

```js
// content.js
export default {
  async items() {
    return [
      // PUBLIC items already ship in the client bundle → no `data` needed.
      { id: 'about', title: 'About', visibility: 'public' },
      // PRIVATE items live server-only. `data` is what the lookup endpoint
      // returns to a visitor holding a live slug that includes this id.
      { id: 'case-secret', title: 'Confidential', visibility: 'private',
        data: { /* the full payload the client renders */ } },
    ]
  },
}
```

Key model: **public content is assumed to already be in your client bundle**;
only *private* `data` travels over the wire, and only when a live slug requests
it. If your site fetches all content per-request (no public catalog in the
bundle), rethink what "public vs private" means for you before proceeding.

## 4. Storage adapter — how the manifest persists

- **`git`** — the manifest is a committed file; `persist` writes, commits, and
  pushes. The push *is* the deploy. Pair with the HTTP verifier (default), which
  polls `prodUrl + lookupPath` until the change is live. Use this on static
  hosts (Vercel/Netlify/Cloudflare Pages).
- **`fs`** — write the manifest and stop. For a long-running Node host with a
  writable disk, or local dev. Verification is a no-op.
- **Custom** — pass `storage: { read(), persist(manifest, message), kind }` to
  back it with a KV store, S3, a database, or a constrained runtime (Wix Velo).

## 5. The admin (operator-only, never deployed)

**a) Dashboard** — mount the dev-only Vite plugin and a dev-only `/admin` route:

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

The plugin is `apply: 'serve'` — it exists only in the dev server and is never
in a production build. That is the whole security model: **the operator keeps
the admin secret by not deploying it.**

**b) Or the CLI** — no UI, no dev plugin. JSON output by default (agent-friendly):

```bash
speakeasy create --label "Acme — Spring" --items about,case-secret --duration 30
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

Unknown, deactivated, and expired slugs all return the **same 404** — a visitor
can't detect a slug ever existed. A live slug returns `{ ids, items }`:
`ids` is the full curated set in order; `items` carries only the private payloads.

## 7. Host rewrite — route `/<slug>` to the app

Each platform differs. Recipes (Vercel, Netlify, Cloudflare, nginx) are in
[`docs/host-rewrites.md`](docs/host-rewrites.md). Two things must be true:
the lookup endpoint is reachable at `prodUrl + lookupPath`, and `/<slug>` falls
through to your SPA so client routing can read the slug.

## 8. The visitor view — render the variant, or an identical dead end

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

Run these after wiring it up — and any time a technical reviewer audits the deploy:

- [ ] **No private data in the public bundle.** Grep the built client output for
      a known private payload string — it must be **absent**. Private `data`
      should appear only in a live lookup response.
- [ ] **No admin in production.** The deployed site exposes only `lookupPath`.
      The Vite plugin is `apply: 'serve'`; there is no `/admin` route or
      `/__speakeasy` API in the production build.
- [ ] **Dead slugs are indistinguishable.** A deactivated, expired, unknown, and
      garbage path all return the identical 404 from the endpoint *and* render
      the identical "not found" view in the client.
- [ ] **Deploy verifies before reporting live.** With `git` storage, the
      dashboard/CLI reports success only after the HTTP verifier confirms the
      change is live (or warns that it couldn't verify before timeout).

## Not the right tool when

- The secret needs real access control, an audit trail, or per-identity
  revocation — speakeasy is **obscurity + curation + lifecycle, not auth**. URLs
  leak via history, `Referer`, and logs.
- The host can't run any endpoint (pure static, no functions).
- You need millions of per-user pages — this is one JSON manifest, one operator.
