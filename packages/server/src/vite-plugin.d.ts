import type { Config, Context } from './index.js'

export interface VitePlugin {
  name: string
  apply: 'serve'
  configureServer(server: any): void
}

/** Dev-only Vite plugin mounting the admin API. Excluded from production builds. */
export declare function speakeasyAdmin(opts?: {
  config?: Config
  context?: Context | ((root: string) => Context)
  basePath?: string
}): VitePlugin
