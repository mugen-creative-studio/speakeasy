# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-05

First public release: stack-agnostic confidential content variants (core,
server, CLI, React admin) with `git`/`fs` storage adapters and a runnable demo.

### Added
- Stack-agnostic core: slug generation, manifest schema, servability and
  lifecycle rules, with zero dependencies.
- Server request handlers plus pluggable adapters (storage, deploy verifier,
  content source); mountable as connect/Express middleware or a Vite dev plugin.
- CLI (`speakeasy`): create, list, deactivate, recurate, lookup, JSON-first.
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

[Unreleased]: https://github.com/mugen-creative-studio/speakeasy/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mugen-creative-studio/speakeasy/releases/tag/v0.1.0
