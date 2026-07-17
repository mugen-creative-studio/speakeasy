// Tests for the `speakeasy admin` server: it serves the dashboard shell and its
// static assets, mounts the admin API on the same port, and never escapes its
// asset directory.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startAdminServer } from '../src/admin-server.js'

function fakeCtx() {
  return {
    content: { items: async () => [{ id: 'a', title: 'A', visibility: 'public' }] },
    storage: { read: async () => ({}), persist: async () => {} },
    verifier: { verify: async () => true },
    prodUrl: 'https://example.com',
  }
}

async function withServer(run) {
  const { server, url } = await startAdminServer(fakeCtx(), { port: 0 })
  try {
    await run(url)
  } finally {
    await new Promise((r) => server.close(r))
  }
}

test('serves the dashboard shell and its static assets', async () => {
  await withServer(async (url) => {
    const index = await fetch(url + '/')
    assert.equal(index.status, 200)
    assert.match(index.headers.get('content-type'), /text\/html/)
    assert.match(await index.text(), /id="root"/)

    const js = await fetch(url + '/app.js')
    assert.equal(js.status, 200)
    assert.match(js.headers.get('content-type'), /javascript/)

    // admin.css is resolved from @speakeasy/admin (shared source of truth).
    const css = await fetch(url + '/admin.css')
    assert.equal(css.status, 200)
    assert.match(css.headers.get('content-type'), /text\/css/)
    assert.match(await css.text(), /sk-shell/)
  })
})

test('mounts the admin API on the same port', async () => {
  await withServer(async (url) => {
    const res = await fetch(url + '/__speakeasy/items')
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.deepEqual(
      body.items.map((i) => i.id),
      ['a'],
    )
  })
})

test('static serving cannot escape the asset directory', async () => {
  await withServer(async (url) => {
    // Even a traversal attempt resolves to a name with no separators, so it
    // stays inside admin-ui and simply 404s (the file does not exist there).
    const res = await fetch(url + '/..%2f..%2fpackage.json')
    assert.equal(res.status, 404)
  })
})
