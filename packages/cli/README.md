# @speakeasy/cli

The command line for
[speakeasy](https://github.com/mugen-creative-studio/speakeasy): share
confidential content behind unguessable URLs, and revoke it when you're done.

Mint, re-curate, and revoke variants from the terminal, no dashboard needed.
Output is JSON by default, so a coding agent can drive it too (add `--pretty`
for human-readable output).

```
speakeasy items                                 list available content items
speakeasy create --label <l> --items a,b,c [--duration <days|none>]  (default: 30 days)
speakeasy list [--all]                          live variants (or all)
speakeasy deactivate <slug>
speakeasy set-duration <slug> --duration <days|none>
speakeasy set-items <slug> --items a,b,c
speakeasy lookup <slug>                         what a visitor would receive
```

Run it in a project that has a `speakeasy.config.js`:

```bash
npx speakeasy list
# or install globally for a bare `speakeasy` command:
npm install -g @speakeasy/cli
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
