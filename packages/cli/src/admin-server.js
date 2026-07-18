// The server behind `speakeasy admin`. It serves the dependency-free HTML
// dashboard (../admin-ui) and mounts the SAME admin API the Vite dev plugin
// uses (createAdminMiddleware), on one local port. It binds to 127.0.0.1, so it
// is never reachable from the network - the admin stays local-only, exactly as
// when it lived only in a dev server. Nothing here is ever deployed.

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createAdminMiddleware } from '@speakeasy/server'

const UI_DIR = new URL('../admin-ui/', import.meta.url)

// The admin API has NO authentication - its only protection is that it is never
// network-reachable. Binding to anything but loopback would expose create/
// deactivate/edit (and the git pushes they trigger) to the local network, so we
// refuse it and fail closed. 127.0.0.0/8 is entirely loopback.
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost'])
function assertLoopbackHost(host) {
  const h = String(host)
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
  if (LOOPBACK_HOSTS.has(h) || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return
  throw new Error(
    `refusing to bind speakeasy admin to "${host}": only loopback is allowed ` +
      `(127.0.0.1, ::1, localhost). The admin API has no authentication and must ` +
      `never be reachable from the network.`,
  )
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
}

// Serve one of the dashboard's static files (index.html, app.js, admin.css),
// all of which live in ../admin-ui. The name is stripped of anything but
// [A-Za-z0-9._-], so it can never contain a path separator and escape the asset
// directory.
function readAsset(name) {
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
  try {
    assertLoopbackHost(host)
  } catch (err) {
    return Promise.reject(err)
  }
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
