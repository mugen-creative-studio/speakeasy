import type { ManifestEntry } from '@speakeasy/core'

export type Manifest = Record<string, ManifestEntry>

/** A single item a variant can reveal. Private items' `data` is server-only. */
export interface ContentItem {
  id: string
  title: string
  meta?: string | null
  visibility: 'public' | 'private'
  data?: unknown
}

/** ContentItem with the private `data` stripped (what the admin list sees). */
export interface ContentRow {
  id: string
  title: string
  meta: string | null
  visibility: 'public' | 'private'
}

export interface ContentSource {
  items(): Promise<ContentItem[]>
}

export interface Storage {
  kind?: string
  read(): Manifest | Promise<Manifest>
  persist(manifest: Manifest, message?: string): Promise<void>
  /** git storage only: commit + push arbitrary paths (used by a visibility toggle). */
  commitPaths?(paths: string[], message?: string): Promise<void>
}

export interface Verifier {
  verify(slug: string, expectLive: boolean): Promise<boolean>
}

export interface Context {
  storage: Storage
  verifier: Verifier
  content: ContentSource
  prodUrl?: string
  commitMessage?: string
}

export interface DecoratedVariant {
  slug: string
  label: string
  items: string[]
  createdAt: string | null
  expiresAt: string | null
  active: boolean
  state: 'live' | 'expired' | 'deactivated'
  daysLeft: number
  url: string
}

export type MutationResult = DecoratedVariant & { verified: boolean; orphans: string[] }

export type LookupResult = {
  status: number
  body: { error: string } | { ids: string[]; items: unknown[] }
}

export declare function handleListItems(ctx: Context): Promise<{ items: ContentRow[] }>
export declare function handleListVariants(ctx: Context): Promise<{ variants: DecoratedVariant[] }>
export declare function handleCreate(
  ctx: Context,
  body: { label?: string; items?: string[]; durationDays?: number | null },
): Promise<MutationResult>
export declare function handlePatch(
  ctx: Context,
  slug: string,
  body:
    | { action: 'deactivate' }
    | { action: 'setDuration'; durationDays?: number | null }
    | { action: 'setItems'; items?: string[] },
): Promise<MutationResult | { error: string }>
/** Flip a project's visibility. Returns read_only if the source can't set it. */
export declare function handleSetVisibility(
  ctx: Context,
  id: string,
  visibility: 'public' | 'private',
): Promise<{ id: string; visibility: 'public' | 'private'; pushed: boolean } | { error: string }>
/** The public lookup. Unknown/deactivated/expired all return an identical 404. */
export declare function handleLookup(
  ctx: Context,
  slug: string,
  now?: number,
): Promise<LookupResult>

export interface Config {
  prodUrl?: string
  manifestPath?: string
  content: ContentSource | string
  storage?: Storage | 'git' | 'fs'
  commitMessage?: string
  lookupPath?: string
  verifyTimeoutMs?: number
  verifyIntervalMs?: number
  verifyHeaders?: Record<string, string>
  verifier?: Verifier
  lookupRateLimit?: { limit?: number; windowMs?: number } | false
}
export declare function createContext(config: Config, opts?: { root?: string }): Context

export declare function createAdminMiddleware(
  ctx: Context,
  opts?: { basePath?: string },
): (req: any, res: any, next?: () => void) => Promise<void>

export declare function loadContent(
  spec: ContentSource | string,
  opts?: { root?: string },
): ContentSource
export declare function toRow(item: ContentItem): ContentRow

/** A single project file in the built-in content layout. */
export interface Project {
  id: string
  title: string
  meta?: string | null
  visibility: 'public' | 'private'
  data?: Record<string, unknown>
}
/** A flattened public-catalog entry: id/title/meta plus the spread render payload. */
export type PublicCatalogEntry = { id: string; title: string; meta: string | null } & Record<
  string,
  unknown
>

/** The files a visibility change touched, so a git-backed admin can commit them. */
export interface VisibilityChange {
  visibility: 'public' | 'private'
  projectFile: string
  catalogFile: string
}
/** A content source backed by the built-in file layout. */
export interface FileContentSource extends ContentSource {
  dir: string
  catalogFile: string
  setVisibility(id: string, visibility: 'public' | 'private'): Promise<VisibilityChange>
}

export declare const CATALOG_BASENAME: string
export declare function readProjects(dir: string, opts?: { root?: string }): Promise<Project[]>
export declare function createFileContentSource(
  dir: string,
  opts?: { root?: string; catalogFile?: string },
): FileContentSource
export declare function writePublicCatalog(
  dir: string,
  outFile: string,
  opts?: { root?: string },
): Promise<PublicCatalogEntry[]>
export declare function setProjectVisibility(
  dir: string,
  id: string,
  visibility: 'public' | 'private',
  opts?: { root?: string; catalogFile?: string },
): Promise<VisibilityChange>

export declare function createGitStorage(opts?: { root?: string; manifestPath?: string }): Storage
export declare function createFsStorage(opts?: { root?: string; manifestPath?: string }): Storage

export declare function createHttpVerifier(opts?: {
  prodUrl?: string
  lookupPath?: string
  param?: string
  timeoutMs?: number
  intervalMs?: number
  headers?: Record<string, string>
}): Verifier
export declare const noopVerifier: Verifier

export interface RateLimitWindow {
  count: number
  start: number
}
export interface RateLimitStore {
  get(key: string, now: number): RateLimitWindow | null
  set(key: string, record: RateLimitWindow, ttlMs: number, now: number): void
}
export declare function createMemoryStore(): RateLimitStore
export declare function createRateLimiter(opts?: {
  limit?: number
  windowMs?: number
  store?: RateLimitStore
}): {
  hit(key: string, now?: number): { allowed: boolean; remaining: number; retryAfterMs: number }
}
/**
 * Best-effort client id from a request. Note: x-forwarded-for is spoofable;
 * pass `{ trustProxy: false }` on a raw host to key on the socket address only.
 * Defaults to trusting the proxy header (correct for Vercel/Netlify/Cloudflare).
 */
export declare function clientKey(req: any, opts?: { trustProxy?: boolean }): string
