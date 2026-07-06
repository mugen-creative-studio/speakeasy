# Security Policy

speakeasy is a tool for sharing confidential content, so its security model and
its limits are part of the product. Read this before you trust it with anything
that matters.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Email **security@mugencreative.studio** with the details. If you would rather
report through GitHub, use its private vulnerability reporting: go to the
**Security** tab of this repository and choose **Report a vulnerability**, which
opens a private advisory visible only to the maintainers. (Maintainers: enable
this under *Settings → Security → Private vulnerability reporting*.)

This is a small project with no formal SLA. Reports are read on a best-effort
basis, taken seriously, and credited unless you ask otherwise.

## Supported versions

speakeasy is pre-1.0. Only the latest released version receives fixes.

| Version | Supported |
| --- | --- |
| latest `0.x` | ✅ |
| older | ❌ |

## Security model

speakeasy is **obscurity + curation + lifecycle, not authentication.** There is
no login. Access is controlled by possession of an unguessable URL.

What it guarantees:

- **Unguessable slugs.** Slugs are 12 characters of base62 drawn from a
  cryptographic random source (`node:crypto` `randomBytes`), about `62^12`
  (~3.2 x 10^21) possibilities. Guessing one by brute force is infeasible.
- **One indistinguishable 404.** Unknown, deactivated, and expired slugs all
  return the identical not-found response. A visitor cannot detect that a slug
  ever existed.
- **Private content stays server-side** until a live slug requests it. The
  public client bundle contains no trace of private payloads; only the specific
  private items a valid slug names are ever sent, and only to that request.

### Why this is safe to open-source

The security rests on the **secret slug, not on secret code** (Kerckhoffs's
principle). An attacker who reads this entire source and knows a site runs
speakeasy still faces an unguessable, cryptographically-random slug behind an
indistinguishable 404. Publishing the algorithm changes nothing, precisely
because slug generation uses a cryptographic random source rather than a
predictable one.

## What speakeasy does NOT protect against

Be honest with yourself about these. They are not bugs; they are the boundary of
what an obscurity-based tool can do.

- **It is not access control.** A slug URL leaks through browser history, the
  `Referer` header, server logs, link previews, and anyone the recipient
  forwards it to. If you need real per-identity access, an audit trail, or
  guaranteed revocation, use authentication instead.
- **It cannot stop an authorized viewer from copying what you showed them.**
  To display content, the browser must receive it; anyone you give a live link
  to can save or screenshot it. This is access control, not DRM.
- **A public source repository defeats it.** With `git` storage the manifest is
  a committed file, and your private content lives in the content source module.
  If the repository holding them is **public**, anyone can read both directly,
  bypassing the slug entirely. **The repository holding real confidential
  content and the manifest must be private.**

## Operator responsibilities

To keep the guarantees above actually true on your deployment:

- **Keep your content/manifest repository private** (see above).
- **Make the client 404 byte-identical** to a junk-URL 404. With an SPA fallback
  every path returns `index.html` (HTTP 200), so your "not found" view for a
  dead slug must look exactly like any random path. A distinct 404 page leaks
  that a slug once existed. See INSTALL.md, section 8.
- **Never deploy the admin.** It is dev-only (a Vite plugin gated to
  `apply: 'serve'`) or CLI-only. The production site must expose only the
  read-only lookup endpoint.
- **Rate-limit the lookup endpoint.** Use the built-in `createRateLimiter` or
  your platform's edge rate limiting / WAF. Note the in-memory limiter is
  best-effort on serverless (per-instance); back it with a shared store for a
  hard cap. See INSTALL.md, section 6. The built-in limiter keys on
  `x-forwarded-for`, which is **spoofable** unless a trusted proxy overwrites it
  (Vercel and Cloudflare do). If clients can reach the function directly, key on
  a header your platform controls (e.g. Cloudflare's `cf-connecting-ip`) or the
  socket address instead.
- **Keep host bypass tokens in environment variables**, never committed. The
  repo gitignores `.env`, `.env.*`, and `.bypass-token`.

## Auditing a deployment

INSTALL.md ends with a verification checklist that doubles as an audit checklist:
no private data in the public bundle, no admin in production, dead slugs
indistinguishable, deploy verified before reporting live, and the lookup
endpoint throttled. Run it after install and any time a reviewer audits the site.
