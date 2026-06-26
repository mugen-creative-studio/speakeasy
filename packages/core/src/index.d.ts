export { DURATIONS, DEFAULT_DURATION_DAYS, DurationPreset } from './durations.js'

/** One slug's entry in the manifest. */
export interface ManifestEntry {
  label: string
  /** Curated, ordered list of content ids this variant reveals. */
  items: string[]
  createdAt: string
  /** ISO timestamp, or null for a variant that never expires. */
  expiresAt: string | null
  active: boolean
}

export type VariantState = 'live' | 'expired' | 'deactivated'

/** Cryptographically-random base62 slug. Server-side only (uses node:crypto). */
export declare function generateSlug(length?: number): string

/** Build a fresh, active manifest entry. `durationDays: null` means no expiry. */
export declare function buildEntry(opts: {
  label?: string
  items?: string[]
  durationDays?: number | null
  now?: number
}): ManifestEntry

/** True only while the entry is active and unexpired. Null/missing -> false. */
export declare function isServable(entry: ManifestEntry | null | undefined, now?: number): boolean

/** Split requested ids into those that exist and orphans, preserving order. */
export declare function partitionItemIds(
  requestedIds: string[],
  validIds: Iterable<string>,
): { valid: string[]; orphans: string[] }

/** Decorate an entry with its lifecycle state. `daysLeft` is Infinity for no-expiry. */
export declare function computeStatus(
  entry: ManifestEntry | null | undefined,
  now?: number,
): { state: VariantState; daysLeft: number }
