# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `docs/using-speakeasy.md`: a plain-language day-to-day guide for site owners
  (create, share, revoke; no coding), linked from the README and handed off at
  the end of INSTALL.md.
- README path for non-developers without a coding agent: hand INSTALL.md to
  any web developer for the one-time setup; daily use needs no developer.
- `clientKey(req, { trustProxy })`: opt out of trusting `x-forwarded-for` on a
  raw host with no trusted proxy (keys on the socket address). Defaults to true,
  so managed hosts (Vercel, Netlify, Cloudflare) are unchanged.

### Changed
- README reorganized around the reader's path (can-you-use-it, why-it's-safe,
  setup, daily use); dropped the standalone demo walkthrough.

### Fixed
- README: the CLI command list now includes `speakeasy items`.

### Security
- The public lookup returns the identical 404 (never a 500) when the storage or
  content source throws, preserving the indistinguishable-404 model on error.
- Manifest lookups are own-key only (`Object.hasOwn`), so a slug such as
  `__proto__` or `constructor` cannot resolve to an inherited object.
- `git` storage stages the manifest with `git add --`, so a `manifestPath`
  beginning with `-` cannot be parsed as a git flag.

## [0.1.2] - 2026-07-06

### Fixed
- README: the bundled-demo command is clarified to require a clone of this
  repo, not an npm install.

## [0.1.1] - 2026-07-06

### Added
- A README in every published package, so the npm pages document what each
  package does and point back to the full guides.
- LICENSE and NOTICE files ship inside every published package, as Apache 2.0
  intends.

## [0.1.0] - 2026-07-05

First public release: stack-agnostic confidential content variants (core,
server, CLI, React admin) with `git`/`fs` storage adapters and a runnable demo.

### Added
- Stack-agnostic core: slug generation, manifest schema, servability and
  lifecycle rules, with zero dependencies.
- Server request handlers plus pluggable adapters (storage, deploy verifier,
  content source); mountable as connect/Express middleware or a Vite dev plugin.
- CLI (`speakeasy`): create, list, deactivate, set-items, set-duration, lookup, JSON-first.
- React admin dashboard with self-contained styling.
- `git` and `fs` storage adapters and a runnable demo.
- TypeScript declarations (`.d.ts`) for the public API of every package.
- `engines` field (Node >= 20) on all packages.
- Rate limiter for the lookup endpoint (`createRateLimiter`), wired into the demo and serverless function.
- Direct tests for `handleLookup`, the security-critical path.
- SECURITY.md (threat model), CONTRIBUTING.md, CODE_OF_CONDUCT.md, and CI.

### Changed
- Manifest writes are atomic (temp file + rename) in both storage adapters.
- Licensed under Apache 2.0 (with NOTICE), copyright Mugen Creative Studio.

[Unreleased]: https://github.com/mugen-creative-studio/speakeasy/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/mugen-creative-studio/speakeasy/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/mugen-creative-studio/speakeasy/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/mugen-creative-studio/speakeasy/releases/tag/v0.1.0
