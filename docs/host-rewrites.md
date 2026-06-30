# Host rewrites

speakeasy serves confidential content at an unguessable top-level path:
`https://yoursite.com/<slug>`. For that to reach your app (instead of 404ing at
the host), the platform must rewrite unknown top-level paths to your app and
expose the lookup endpoint. This is the one piece that differs per host.

Two things must be true:

1. **The lookup endpoint is reachable** at `prodUrl + lookupPath`
   (default `/api/variant?slug=…`). The deploy verifier polls it; your client
   calls it to resolve a slug.
2. **`/<slug>` routes to your SPA/app**, so client-side routing can read the
   slug and call the endpoint.

## Vercel

`vercel.json`, keeping the SPA rewrite and excluding `/api`:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

Put the lookup handler at `api/variant.js` (see the server package's
`handleLookup`). Adding an `api/` directory drops Vite's implicit SPA rewrite, so
ship the `vercel.json` in the same commit.

## Netlify

`netlify.toml` / `_redirects`:

```
/api/*  /.netlify/functions/:splat  200
/*      /index.html                 200
```

## Cloudflare Pages

Use a Pages Function for `/api/variant` and a `_redirects` file with
`/*  /index.html  200` for SPA fallback (Functions take precedence over the
catch-all).

## Self-hosted (nginx)

```nginx
location /api/ { proxy_pass http://app; }
location /     { try_files $uri /index.html; }
```

## A note on secrecy

There is no admin surface in production. The admin server runs only in dev
(the Vite plugin is `apply: 'serve'`) or via the CLI on your machine. The
deployed site only ever exposes the read-only lookup endpoint, which returns an
identical 404 for unknown, deactivated, and expired slugs.
