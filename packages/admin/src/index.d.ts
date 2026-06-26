import type { ComponentType } from 'react'

export interface AdminAppProps {
  title?: string
  subtitle?: string
  /** Base path of the admin JSON API. Defaults to '/__speakeasy'. */
  basePath?: string
}

/** The React admin dashboard. Mount on a dev-only route; never ship to production. */
export declare const AdminApp: ComponentType<AdminAppProps>
