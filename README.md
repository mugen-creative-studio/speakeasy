# speakeasy

Share confidential content with one person at a time, behind an unguessable
URL, and revoke it when you're done.

You hand someone `https://yoursite.com/Xa9f2Qb7Lm3k`. They see a curated set of
otherwise-hidden content. Anyone without the slug — and anyone with a
deactivated or expired one — gets an identical 404, so a visitor can never even
tell a slug existed. You mint, curate, expire, and kill these variants from a
local admin dashboard or a CLI.

This was extracted from a portfolio that used it to show confidential case
studies to specific companies during a job search. The mechanism is
content-neutral: a variant reveals a curated list of *items*, whatever those are
for you.

## Why it's safe to deploy

- **No admin in production.** The admin API runs only in your dev server (a Vite
  plugin gated to `apply: 'serve'`) or via the CLI on your machine. The deployed
  site exposes only a read-only lookup endpoint.
- **Private data never ships to the client** until a live slug asks for it. The
  public bundle has no trace of it.
- **One indistinguishable 404** for unknown / deactivated / expired slugs.

## Packages

| Package | What it is |
| --- | --- |
| [`@speakeasy/core`](packages/core) | Pure logic: slug generation, manifest schema, servability + lifecycle rules. Zero deps. |
| [`@speakeasy/server`](packages/server) | Request handlers + pluggable adapters (storage, deploy-verifier, content source). Mount as connect/Express middleware or a Vite dev plugin. |
| [`@speakeasy/cli`](packages/cli) | `speakeasy` command — create/list/deactivate/recurate/lookup. JSON output by default so agents can drive it. |
| [`@speakeasy/admin`](packages/admin) | React admin dashboard. Self-contained styling; theme via CSS variables. |

## The four seams that make it agnostic

1. **Content source** — you implement `items()` returning what a variant can
   reveal (public vs private, with private payloads). See
   [`examples/content.example.js`](examples/content.example.js).
2. **Storage adapter** — `git` (commit + push; the deploy *is* the push) or `fs`
   (write and done), or your own `{ read, persist }`.
3. **Deploy verifier** — polls your live lookup endpoint until the change is
   reflected (git), or a no-op (fs).
4. **Host rewrite** — route `/<slug>` to your app and expose the lookup
   endpoint. Per-platform recipes in [`docs/host-rewrites.md`](docs/host-rewrites.md).

## Quick start

```bash
npm install   # workspaces: core, server, cli, admin
npm test      # core unit tests + server end-to-end smoke test
```

Then in your app:

```js
// speakeasy.config.js  — see speakeasy.config.example.js
export default {
  prodUrl: 'https://yoursite.com',
  manifestPath: 'api/_variants.json',
  content: './content.js',
  storage: 'git',
}
```

```js
// vite.config.js
import { speakeasyAdmin } from '@speakeasy/server/vite'
import config from './speakeasy.config.js'
export default defineConfig({ plugins: [react(), speakeasyAdmin({ config })] })
```

```jsx
// wherever you mount a dev-only /admin route
import { AdminApp } from '@speakeasy/admin'
import '@speakeasy/admin/admin.css'
export default () => <AdminApp />
```

```js
// api/variant.js — the one production endpoint
import { createContext, handleLookup } from '@speakeasy/server'
import config from '../speakeasy.config.js'
const ctx = createContext({ ...config, storage: 'fs' }) // read-only on the server
export default async function (req, res) {
  const { status, body } = await handleLookup(ctx, req.query.slug)
  res.status(status).json(body)
}
```

Or skip the UI entirely:

```bash
speakeasy create --label "Acme — Spring" --items about,case-secret --duration 30
speakeasy list
speakeasy deactivate Xa9f2Qb7Lm3k
```

## License

MIT.
