import { useEffect, useState, lazy, Suspense } from 'react'
import { PUBLIC_CASES } from './publicCatalog.js'

// The admin dashboard is lazy-loaded and gated behind import.meta.env.DEV, so
// its code AND styles are tree-shaken out of the production bundle entirely -
// mirroring the real model where the admin only ever runs on the operator's
// machine. In a prod build AdminRoute is null and /admin falls through to the
// same indistinguishable 404 as any junk path.
const AdminRoute = import.meta.env.DEV
  ? lazy(() =>
      Promise.all([import('@speakeasy/admin'), import('@speakeasy/admin/admin.css')]).then(
        ([mod]) => ({ default: mod.AdminApp }),
      ),
    )
  : null

// A deliberately tiny router. Three destinations:
//   /        → the public site (everyone sees this; public cases only)
//   /admin   → the speakeasy dashboard (dev only; mint & curate variants)
//   /<slug>  → a variant: resolve the slug, render its curated set, or a 404
//              that is byte-identical to any junk URL.
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/admin' && AdminRoute) {
    return (
      <Suspense fallback={null}>
        <AdminRoute
          title="Portfolio variants"
          subtitle="Local dashboard · mint a secret link, choose what it reveals, revoke when done"
        />
      </Suspense>
    )
  }
  if (path === '/') return <Site cases={PUBLIC_CASES} />
  return <Variant slug={decodeURIComponent(path.slice(1))} />
}

// The site shell. Identical for the public view and any variant - only the set
// of cases differs. That sameness is the point: a visitor can't tell a curated
// variant from the plain public site.
function Site({ cases }) {
  return (
    <main className="site">
      <header className="masthead">
        <span className="wordmark">Atelier</span>
        <span className="tagline">Product design studio · selected work</span>
      </header>
      <ul className="work">
        {cases.map((c) => (
          <li key={c.id} className="case">
            <div className="case-head">
              <h2 className="case-title">{c.title}</h2>
              <span className="case-meta">{c.meta}</span>
            </div>
            <p className="case-summary">{c.summary}</p>
            <p className="case-body">{c.body}</p>
          </li>
        ))}
      </ul>
      <footer className="site-footer">
        <span>© Atelier</span>
        {/* Demo affordance, dev only - a real deploy never advertises (or ships) the dashboard. */}
        {import.meta.env.DEV && (
          <a className="demo-link" href="/admin">demo: open the dashboard →</a>
        )}
      </footer>
    </main>
  )
}

// Resolve a slug against the lookup endpoint, then render the curated set in the
// order the manifest specifies. Public ids render from the bundle (PUBLIC_CASES);
// private ids render from the payloads the endpoint returned.
function Variant({ slug }) {
  const [phase, setPhase] = useState('loading') // loading | ready | notfound
  const [cases, setCases] = useState([])

  useEffect(() => {
    let live = true
    fetch(`/api/variant?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!live) return
        if (res.status !== 200) return setPhase('notfound')
        const { ids = [], items = [] } = await res.json()
        const publicById = new Map(PUBLIC_CASES.map((c) => [c.id, c]))
        const privateById = new Map(items.map((i) => [i.id, i]))
        const resolved = ids.map((id) => publicById.get(id) || privateById.get(id)).filter(Boolean)
        setCases(resolved)
        setPhase('ready')
      })
      .catch(() => live && setPhase('notfound'))
    return () => {
      live = false
    }
  }, [slug])

  if (phase === 'loading') return null
  if (phase === 'notfound') return <NotFound />
  return <Site cases={cases} />
}

// The indistinguishable dead end. A deactivated/expired/unknown slug all land
// here - identical to typing any nonsense path. Nothing hints a slug ever lived.
function NotFound() {
  return (
    <main className="site notfound">
      <header className="masthead">
        <span className="wordmark">Atelier</span>
      </header>
      <p className="notfound-msg">This page can’t be found.</p>
      <a className="notfound-home" href="/">Back to home</a>
    </main>
  )
}
