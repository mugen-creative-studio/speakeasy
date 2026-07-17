# @speakeasy/server

The server side of
[speakeasy](https://github.com/mugen-creative-studio/speakeasy): share
confidential content behind unguessable URLs, and revoke it when you're done.

Given a slug, `handleLookup` returns the curated items for a live variant, or
an identical 404 for anything unknown, expired, or deactivated, so a visitor
cannot tell a dead slug ever existed. You plug it into your own app and point
it at your content and manifest:

- `createContext(config)` + `handleLookup(ctx, slug)` - the one endpoint you
  deploy
- `speakeasyAdmin` (via `@speakeasy/server/vite`) - a dev-only Vite plugin that
  serves the admin API; it never ships to production
- `createAdminMiddleware` - the same admin API as connect/Express middleware
- `createGitStorage` / `createFsStorage` - manifest persistence (commit + push,
  or write to disk), or bring your own `{ read, persist }`
- `createHttpVerifier` / `noopVerifier` - confirm a change is live before
  reporting success
- `createRateLimiter`, `clientKey` - optional throttle for the lookup endpoint.
  `clientKey(req)` trusts the proxy's `x-forwarded-for` (correct on Vercel /
  Netlify / Cloudflare); on a raw host clients can reach directly, pass
  `clientKey(req, { trustProxy: false })` to key on the socket address instead

```bash
npm install @speakeasy/core @speakeasy/server
```

Requires Node 20 or newer.

## Documentation

Full setup lives in the repo:
[README](https://github.com/mugen-creative-studio/speakeasy#readme) for the
overview,
[INSTALL.md](https://github.com/mugen-creative-studio/speakeasy/blob/main/INSTALL.md)
for the step-by-step integration guide (written so a coding agent can follow
it), and
[SECURITY.md](https://github.com/mugen-creative-studio/speakeasy/blob/main/SECURITY.md)
for the threat model and its limits.

## License

Apache 2.0. See [LICENSE](LICENSE).
