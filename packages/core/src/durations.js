// Browser-safe constants shared by the endpoint, the admin server, the CLI, and
// the admin UI. Kept free of any node: imports so it can be bundled for the
// browser (the slug generator in slug.js uses node:crypto and cannot).

export const DEFAULT_DURATION_DAYS = 30

// Duration presets offered in the dashboard. `1 month` is the default.
// `days: null` means the variant never expires.
export const DURATIONS = [
  { label: '1 day', days: 1 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '2 months', days: 60 },
  { label: 'No expiry', days: null },
]
