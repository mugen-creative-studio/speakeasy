// Dev-only Vite plugin that mounts the admin API. Registered for the dev server
// only (apply: 'serve'), so it never exists in a production build - there is no
// admin surface on the deployed site. The host keeps its admin secret simply by
// not deploying it.
//
//   // vite.config.js
//   import { speakeasyAdmin } from '@speakeasy/server/vite'
//   import config from './speakeasy.config.js'
//   export default defineConfig({
//     plugins: [react(), speakeasyAdmin({ config })],
//   })

import { createContext } from './context.js'
import { createAdminMiddleware } from './middleware.js'

export function speakeasyAdmin({ config, context, basePath = '/__speakeasy' } = {}) {
  return {
    name: 'speakeasy-admin',
    apply: 'serve', // dev server only - excluded from production builds
    configureServer(server) {
      const root = server.config.root
      // Accept a ready-made ctx, a ctx factory, or a config to build from.
      const ctx =
        typeof context === 'function'
          ? context(root)
          : context ?? createContext(config, { root })
      server.middlewares.use(createAdminMiddleware(ctx, { basePath }))
    },
  }
}
