# speakeasy

[![CI](https://github.com/mugen-creative-studio/speakeasy/actions/workflows/ci.yml/badge.svg)](https://github.com/mugen-creative-studio/speakeasy/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)

> This is a personal project I built for fun and wanted to share. It's provided
> as-is, so updates may be slow and I might not get to every issue or PR, but I'm
> glad you're here.

Share confidential content with whoever you choose, behind an unguessable URL,
and revoke it when you're done.

You hand someone a link like `https://yoursite.com/Xa9f2Qb7Lm3k`. They see a
curated set of otherwise-hidden content. Anyone without that link gets a plain
404, and so does anyone whose link you have deactivated or let expire. A visitor
cannot even tell the link existed.

You create, curate, and revoke these variants from a local admin dashboard or
the CLI. A variant reveals a curated list of *items*, and you decide what an item
is: a case study, a document, a draft page, a photo set. The mechanism does not
care what the content is.

## Can you use this?

- ✅ **Yes** if your site is a coded site in a repo that deploys to Vercel,
  Netlify, Cloudflare, or your own server. Hand the repo to your coding agent
  along with [INSTALL.md](INSTALL.md), and it handles the integration.
- ⚠️ **Maybe** (ask a developer or agent first) for Webflow **Cloud** or Wix
  **Velo**. It is possible, but the server seam is custom work on their runtime.
- ❌ **No** for drag-and-drop Squarespace, Wix, or classic Webflow with no code
  access. speakeasy runs a small amount of code on your site, and these
  platforms do not allow that.
- 🤷 **Not sure?** Ask your coding agent: *"Can you add a serverless endpoint and
  a catch-all route to this site?"* If the answer is yes, you are in the ✅
  column.

**No coding agent and not a developer?** You can still use speakeasy; you just
need help with the one-time installation. Hand [INSTALL.md](INSTALL.md) to any
web developer (it is a small, well-defined job against a working reference).
After that, **day-to-day use needs no developer at all**: creating, sharing,
and revoking links is point-and-click, covered in the plain-language
[owner's guide](docs/using-speakeasy.md).

## Why it's safe to deploy

- **No admin in production.** The admin API runs only in your dev server (a Vite
  plugin gated to `apply: 'serve'`) or through the CLI on your own machine. The
  deployed site exposes a single read-only lookup endpoint, nothing more.
- **Private data never ships to the client** until a live slug asks for it. The
  public bundle holds no trace of it.
- **One indistinguishable 404.** Unknown, deactivated, and expired slugs all
  return the identical response.

> **The one thing that's on you:** with `git` storage the manifest is a
> committed file, so keep the repository holding it **private**. A public repo
> exposes every slug and defeats the model. See [SECURITY.md](SECURITY.md) and
> [INSTALL.md](INSTALL.md).

## Setting it up

speakeasy is not a standalone app you launch; it wires into your own site as a
one-time integration. [INSTALL.md](INSTALL.md) is the complete step-by-step
guide, written for a coding agent (or web developer) to follow against the
runnable reference in [`examples/demo`](examples/demo) (from a clone of this
repo: `npm run dev --workspace examples/demo`). Point your agent at it, or hand
it to whoever maintains your site.

The short version: install the packages you need,

```bash
npm install @speakeasy/core @speakeasy/server @speakeasy/cli @speakeasy/admin
```

then follow INSTALL.md to add a config file, a content source, one deployed
lookup endpoint, and a host rewrite. Everything else stays on your machine.

## Day-to-day use

Once installed, creating, sharing, and revoking links needs no coding; the
plain-language guide for site owners is
[docs/using-speakeasy.md](docs/using-speakeasy.md). You manage variants one of
two ways:

**Dashboard** - start your usual dev server and open the dev-only `/admin` route:

```bash
npm run dev            # your site's dev server
# then open http://localhost:5173/admin
```

![The admin dashboard: a label field, expiry options, toggles for each content item, and a Create link button](docs/admin-dashboard.png)

**CLI** - run it inside your project with `npx`, or install it globally for a
bare `speakeasy` command anywhere:

```bash
npx speakeasy create --label "Acme - Spring" --items about,case-secret --duration 30
npx speakeasy list
npx speakeasy deactivate Xa9f2Qb7Lm3k
# or: npm install -g @speakeasy/cli   ->   then just `speakeasy list`
```

The visitor-facing lookup (`/<slug>` to the curated content, or an identical
404) needs no launching: it runs on every request to your deployed site.

## Packages

speakeasy is four small packages under the `@speakeasy` scope. Install only the
ones you need: `core` and `server` are the base, then pick `cli` or `admin` (or
both) for how you want to manage variants.

| Package | What it does | You need it |
| --- | --- | --- |
| [`@speakeasy/core`](packages/core) | The engine, with zero dependencies. It generates the unguessable slugs, defines the *manifest* (the record of which slug reveals which items and when it expires), and decides whether a given slug is live, expired, or revoked. | Always |
| [`@speakeasy/server`](packages/server) | The part that answers a visitor. Given a slug it returns the curated items, or the identical 404 for anything unknown, expired, or revoked. You plug it into your app (as Express/connect middleware or a Vite dev plugin) and point it at where your content and manifest live. | Always |
| [`@speakeasy/cli`](packages/cli) | A terminal command (`speakeasy items`, `create`, `list`, `deactivate`, `set-items`, `set-duration`, `lookup`) for minting, re-curating, and revoking variants without a UI. Outputs JSON, so a coding agent can drive it too. | If you manage variants from the command line |
| [`@speakeasy/admin`](packages/admin) | A small React dashboard for the same create / curate / revoke actions, for when you'd rather click than type. Runs only in your dev environment; it is never deployed to production. Requires `react` + `react-dom` 18+ already in your project (peer dependency); if your site isn't React, use the CLI instead. | If you want the visual dashboard |

## The four seams that make it agnostic

1. **Content source.** You implement `items()`, returning what a variant can
   reveal (public versus private, with the private payloads). See
   [`examples/content.example.js`](examples/content.example.js).
2. **Storage adapter.** Use `git` (commit and push, where the deploy is the
   push) or `fs` (write and done), or supply your own `{ read, persist }`.
3. **Deploy verifier.** Polls your live lookup endpoint until the change is
   reflected (git), or does nothing at all (fs).
4. **Host rewrite.** Routes `/<slug>` to your app and exposes the lookup
   endpoint. Per-platform recipes live in
   [`docs/host-rewrites.md`](docs/host-rewrites.md).

## Contributing

Issues and PRs are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md) for how to
run the tests and what to expect. Release history lives in
[CHANGELOG.md](CHANGELOG.md).

## License

Apache 2.0. See [LICENSE](LICENSE).
