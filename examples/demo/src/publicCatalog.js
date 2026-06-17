// The PUBLIC catalog — safe to ship in the browser bundle. This is the content
// anyone sees at `/` with no slug. speakeasy assumes exactly this: your public
// content already lives client-side, so a variant lookup only ever sends the
// PRIVATE payloads over the wire (see content.js for the server-only half).
//
// Each case is a full render payload; the variant view renders public ids
// straight from here, and private ids from what the lookup endpoint returns.

export const PUBLIC_CASES = [
  {
    id: 'case-alpha',
    title: 'Lumen — Banking App',
    meta: 'Acme Financial',
    summary: 'A ground-up redesign of a retail banking app, from onboarding to payments.',
    body: 'We rebuilt Lumen around a single principle: every screen answers "where is my money, and what can I do with it right now?" Onboarding dropped from 11 steps to 4, and weekly active use rose 38% in the first quarter after launch.',
  },
  {
    id: 'case-beta',
    title: 'Orbit — Design System',
    meta: 'Globex',
    summary: 'A 40-component design system unifying six product teams on one language.',
    body: 'Orbit replaced four divergent component libraries with one tokenized system. Design-to-ship time for a new screen fell from days to hours, and accessibility audits went from manual to automated in CI.',
  },
  {
    id: 'case-gamma',
    title: 'Mesa — Commerce Redesign',
    meta: 'Initech',
    summary: 'Rethinking checkout for a high-volume marketplace.',
    body: 'Mesa’s checkout was leaking buyers at payment. We cut the flow to a single reviewable page, added express paths, and recovered an estimated 12% of abandoned carts within two months.',
  },
]
