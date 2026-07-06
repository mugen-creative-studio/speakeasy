# Releasing

All four packages (`@speakeasy/core`, `server`, `cli`, `admin`) publish together
at a single shared version. Internal dependencies are exact-pinned, so versions
must move in lockstep - `npm run version:bump` handles that for you.

## One-time setup

These are manual and cannot be scripted from CI:

1. **Own the npm scope.** The `@speakeasy` scope/org must exist and you must be a
   member. Create it once at https://www.npmjs.com/org/create (the org is free
   for public packages), or if publishing under a different scope, rename the
   `@speakeasy/*` packages first.
2. **Add the CI token.** Create an npm **Automation** token (Access Tokens ->
   Generate New Token -> Automation) and add it to the repo as the
   `NPM_TOKEN` secret (Settings -> Secrets and variables -> Actions).
3. **Local publish (optional).** To publish from your machine instead of CI, run
   `npm login` first.

## Cutting a release

```bash
npm run version:bump -- minor      # or: patch | major | x.y.z
# edit CHANGELOG.md: move [Unreleased] items into a new dated section
npm install                        # refresh the lockfile with the new versions
git commit -am "release: v0.2.0"
git tag v0.2.0
git push && git push --tags
```

Pushing the `v*` tag triggers `.github/workflows/release.yml`, which verifies the
tag matches `package.json`, re-runs format + tests, and publishes every workspace
with provenance.

## Publishing manually (fallback)

If CI is unavailable, after `npm login`:

```bash
npm run release                    # runs format:check + test, then publishes
```
