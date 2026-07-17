// The server behind `speakeasy admin`. It serves the dependency-free HTML
// dashboard (../admin-ui) and mounts the SAME admin API the Vite dev plugin
// uses (createAdminMiddleware), on one local port. It binds to 127.0.0.1, so it
// is never reachable from the network - the admin stays local-only, exactly as
// when it lived only in a dev server. Nothing here is ever deployed.

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createAdminMiddleware } from '@speakeasy/server'

const require = createRequire(import.meta.url)
const UI_DIR = new URL('../admin-ui/', import.meta.url)

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
}

// Serve one of the dashboard's static files. `admin.css` is resolved from
// @speakeasy/admin (its single source of truth) so the standalone dashboard and
// the embedded React one can never drift; everything else lives in ../admin-ui.
// The name is stripped of anything but [A-Za-z0-9._-], so it can never contain a
// path separator and escape the asset directory.
function readAsset(name) {
  if (name === 'admin.css') return readFile(require.resolve('@speakeasy/admin/admin.css'))
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '')
  return readFile(new URL(safe, UI_DIR))
}

// Start the dashboard server. Resolves to { server, url } once it is listening.
// `port: 0` picks a free port (used by tests). Rejects on listen errors (e.g.
// EADDRINUSE) so the caller can retry on another port.
export function startAdminServer(
  ctx,
  { host = '127.0.0.1', port = 4599, basePath = '/__speakeasy' } = {},
) {
  const admin = createAdminMiddleware(ctx, { basePath })
  const server = createServer((req, res) => {
    const url = req.url || '/'
    if (url === basePath || url.startsWith(basePath + '/') || url.startsWith(basePath + '?')) {
      return admin(req, res, () => {
        res.statusCode = 404
        res.end()
      })
    }
    const pathname = url.split('?')[0]
    const name = pathname === '/' ? 'index.html' : pathname.slice(1)
    const ext = name.slice(name.lastIndexOf('.'))
    readAsset(name)
      .then((buf) => {
        res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream')
        res.end(buf)
      })
      .catch(() => {
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end('Not found')
      })
  })

  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, host, () => {
      const { port: boundPort } = server.address()
      resolve({ server, url: `http://${host}:${boundPort}` })
    })
  })
}
