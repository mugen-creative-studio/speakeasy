# @speakeasy/core

The engine of [speakeasy](https://github.com/mugen-creative-studio/speakeasy):
share confidential content behind unguessable URLs, and revoke it when you're
done.

`core` is the framework-agnostic logic, with **zero dependencies**:

- `generateSlug()` - unguessable slugs from a cryptographic random source
- `buildEntry`, `computeStatus`, `isServable`, `partitionItemIds` - the
  *manifest* model: which slug reveals which items, and whether a slug is
  live, expired, or deactivated
- `DURATIONS`, `DEFAULT_DURATION_DAYS` - expiry presets (also exported from
  `@speakeasy/core/durations`)

You rarely use this package alone. Pair it with
[`@speakeasy/server`](https://www.npmjs.com/package/@speakeasy/server), which
answers visitor lookups, and manage variants with
[`@speakeasy/cli`](https://www.npmjs.com/package/@speakeasy/cli) - terminal
commands plus the standalone `speakeasy admin` browser dashboard.

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
