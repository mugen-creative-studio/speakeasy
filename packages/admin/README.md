# @speakeasy/admin

The dashboard for
[speakeasy](https://github.com/mugen-creative-studio/speakeasy): share
confidential content behind unguessable URLs, and revoke it when you're done.

A small React app for creating, curating, and revoking variants when you'd
rather click than type. It runs **only in your dev environment**, mounted on a
dev-only route, and is never deployed to production; that is the security
model. It talks to the admin API served by
[`@speakeasy/server`](https://www.npmjs.com/package/@speakeasy/server)'s Vite
dev plugin.

```jsx
// a dev-only /admin route in your app
import { AdminApp } from '@speakeasy/admin'
import '@speakeasy/admin/admin.css'
export default () => <AdminApp />
```

Requires `react` and `react-dom` 18 or newer already in your project (peer
dependencies), and Node 20 or newer.

**Not a React site, or just want the dashboard without wiring anything?** Run
`npx speakeasy admin` (from [`@speakeasy/cli`](https://www.npmjs.com/package/@speakeasy/cli)):
it opens the same dashboard as a standalone local app on any stack, no Vite or
React required. This React component is for embedding the dashboard inline in a
Vite dev server. The CLI also offers the same actions with no UI at all.

```bash
npm install @speakeasy/admin
```

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
