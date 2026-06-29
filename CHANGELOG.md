# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- TypeScript declarations (`.d.ts`) for the public API of every package.
- `engines` field (Node >= 20) on all packages.
- Rate limiter for the lookup endpoint (`createRateLimiter`), wired into the demo and serverless function.
- Direct tests for `handleLookup`, the security-critical path.
- SECURITY.md (threat model), CONTRIBUTING.md, CODE_OF_CONDUCT.md, and CI.

### Changed
- Manifest writes are now atomic (temp file + rename) in both storage adapters.
- Bumped demo dev tooling (vite 7, plugin-react 5) to clear a dev-only advisory.
- LICENSE copyright holder set to Mugen Creative Studio.

## [0.1.0]
- Initial release: stack-agnostic confidential content variants (core, server,
  CLI, React admin) with `git`/`fs` storage adapters and a runnable demo.
