# Releasing

All three packages (`@speakeasy/core`, `server`, `cli`) publish together
at a single shared version. Internal dependencies are exact-pinned, so versions
must move in lockstep - `npm run version:bump` handles that for you.

Publishing uses **GitHub Actions OIDC trusted publishing**: no npm token is ever
stored, so there is nothing for an attacker to steal. GitHub authenticates to
npm directly for each release, and provenance is generated automatically because
the repo and packages are public.

## One-time setup

These are manual and cannot be scripted:

1. **Own the npm scope.** The `@speakeasy` org must exist and you must be a
   member. (Done.)
2. **Enable 2FA** on both your **npm** account (Settings -> Two-Factor
   Authentication) and your **GitHub** account. Required for the bootstrap
   publish below and basic account-theft hygiene.
3. **Bootstrap the first publish (once per package).** A trusted publisher is
   configured in each package's npmjs.com settings, which requires the package
   to already exist. So publish the first version of all three manually:
   ```bash
   npm login                       # completes with 2FA
   npm run prerelease              # format:check + tests
   npm publish --workspaces        # no --provenance here; provenance needs CI OIDC
   ```
   (This first version publishes without provenance; every later CI release has
   it.)
4. **Register the trusted publisher.** For each of the three packages, on
   npmjs.com -> the package -> **Settings -> Trusted Publisher**, add:
   - Provider: **GitHub Actions**
   - Repository: `mugen-creative-studio/speakeasy`
   - Workflow: `release.yml`

   After this, no npm token is needed and tag pushes publish automatically.

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
via OIDC (no secrets), with automatic provenance.

Trusted publishing requires npm >= 11.5.1 and Node >= 22.14; the workflow
upgrades npm itself, so there is nothing to do locally.

## Publishing manually (fallback)

If CI is unavailable, after `npm login` (2FA):

```bash
npm run release                    # runs format:check + test, then publishes
```

A local publish does not produce provenance (that needs CI OIDC), but is
otherwise a valid release.
