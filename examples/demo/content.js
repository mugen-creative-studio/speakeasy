// The content source — speakeasy's content seam. It answers one question:
// "what can a variant reveal?" It runs server-side only (in the dev plugin /
// the lookup endpoint), so this is the safe place for confidential payloads.
//
//   - PUBLIC items already ship in the browser bundle (see src/publicCatalog.js),
//     so they carry no `data` here — the client already has them.
//   - PRIVATE items live ONLY here. Their `data` is what the lookup endpoint
//     sends to a visitor holding a live slug that includes them. They never
//     appear in the public bundle.

import { PUBLIC_CASES } from './src/publicCatalog.js'

// The NDA work — the whole reason speakeasy exists. Never in the public bundle.
const PRIVATE_CASES = [
  {
    id: 'case-nightingale',
    title: 'Project Nightingale',
    meta: 'Stealth Health · under NDA',
    summary: 'A confidential clinical dashboard for a pre-launch health startup.',
    body: 'Nightingale gives care teams a single triage view across thousands of remote patients. We designed the alerting model, the escalation flows, and the at-a-glance vitals timeline. Unannounced — shared here only with people holding a live link.',
  },
]

export default {
  async items() {
    return [
      ...PUBLIC_CASES.map((c) => ({
        id: c.id,
        title: c.title,
        meta: c.meta,
        visibility: 'public',
      })),
      ...PRIVATE_CASES.map((c) => ({
        id: c.id,
        title: c.title,
        meta: c.meta,
        visibility: 'private',
        data: c, // the full payload the lookup endpoint returns to a live slug
      })),
    ]
  },
}
