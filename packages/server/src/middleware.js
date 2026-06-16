// A connect/Express-style middleware exposing the admin JSON API under
// `basePath`. The browser admin UI calls these; the browser can't run git or
// touch the filesystem, this Node-side handler does. Mount it in a Vite dev
// server (see vite-plugin.js), an Express app, or any connect stack.

import { handleListItems, handleListVariants, handleCreate, handlePatch } from './handlers.js'

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

export function createAdminMiddleware(ctx, { basePath = '/__speakeasy' } = {}) {
  return async function speakeasyAdmin(req, res, next) {
    const url = req.url || ''
    if (!url.startsWith(basePath)) return next ? next() : undefined
    const pathname = url.split('?')[0]

    try {
      if (req.method === 'GET' && pathname === `${basePath}/items`) {
        return sendJson(res, 200, await handleListItems(ctx))
      }
      if (req.method === 'GET' && pathname === `${basePath}/variants`) {
        return sendJson(res, 200, await handleListVariants(ctx))
      }
      if (req.method === 'POST' && pathname === `${basePath}/variants`) {
        return sendJson(res, 200, await handleCreate(ctx, await readBody(req)))
      }
      if (req.method === 'PATCH' && pathname.startsWith(`${basePath}/variants/`)) {
        const slug = decodeURIComponent(pathname.split('/').pop())
        const result = await handlePatch(ctx, slug, await readBody(req))
        return sendJson(res, result.error ? 400 : 200, result)
      }
      return sendJson(res, 404, { error: 'not_found' })
    } catch (err) {
      return sendJson(res, 500, { error: 'server_error', message: String(err?.message || err) })
    }
  }
}
