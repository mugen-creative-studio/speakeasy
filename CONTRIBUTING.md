# Contributing to speakeasy

Thanks for your interest. speakeasy is a small, deliberately minimal project, so
contributions that keep it small fit best.

Heads up: this is a personal project shared as-is. Issues and PRs are welcome,
but a response or a merge may be slow, and may not come at all. Please open them
anyway if you like, and feel free to fork if you need to move faster.

## Reporting security issues

Do **not** open a public issue for a vulnerability. See [SECURITY.md](SECURITY.md)
for private reporting.

## Getting set up

Requires Node 20 or newer (the code uses JSON import attributes and the built-in
`node:test` runner).

```bash
git clone <your fork>
cd speakeasy
npm install        # installs all workspaces: core, server, cli, admin, demo
npm test           # core unit tests + server end-to-end smoke test
```

Run the reference demo on localhost:

```bash
npm run dev --workspace examples/demo
# public site at /, the dev-only dashboard at /admin, a variant at /<slug>
```

## How the project is laid out

It is an npm-workspaces monorepo. Each package does one job:

| Package | Responsibility |
| --- | --- |
| `packages/core` | Pure logic: slug generation, manifest schema, lifecycle rules. **Zero dependencies.** |
| `packages/server` | Request handlers + pluggable adapters (storage, deploy verifier, content source, rate limiter). Framework-agnostic. |
| `packages/cli` | The `speakeasy` command. |
| `packages/admin` | The React dashboard (dev/operator-only). |
| `examples/demo` | The runnable reference wiring that INSTALL.md points at. |

The design is built around four seams (content source, storage adapter, deploy
verifier, host rewrite). Most features should fit one of these rather than adding
a new concept. See the README for the seam overview.

## Ground rules that keep the design intact

- **`packages/core` stays dependency-free** and isomorphic. Anything needing
  Node APIs (filesystem, git, crypto-for-IO) belongs in `packages/server`.
- **The admin never reaches production.** Keep it behind the dev-only plugin and
  the `import.meta.env.DEV` gate. The deployed site exposes only the read-only
  lookup endpoint.
- **Preserve the indistinguishable 404.** Any change to lookup or lifecycle must
  keep unknown, deactivated, and expired slugs returning the same response.
- **Do not weaken slug entropy.** Slugs must come from a cryptographic random
  source.

## Code style

- Match the surrounding code. It is modern ESM JavaScript, no TypeScript, no
  build step for the libraries.
- No em dashes in prose or comments (use commas, parentheses, or hyphens).
- Keep comments explaining *why*, in the voice of the existing files.

## Submitting a change

1. Branch from `main` (`feat/...`, `fix/...`, `docs/...`).
2. Add or update tests. Tests use `node:test`; keep `core` tests dependency-free.
3. Make sure `npm test` passes. CI runs the same on every PR.
4. Open a PR describing what changed and why. Link any related issue.

Small, focused PRs are easiest to review. If you are planning something larger,
consider opening an issue first to talk through the shape (keeping in mind a
reply is not guaranteed).
