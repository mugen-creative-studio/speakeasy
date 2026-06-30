import { useCallback, useEffect, useRef, useState } from 'react'
import Tabs from './Tabs.jsx'
import { DURATIONS, DEFAULT_DURATION_DAYS } from '@speakeasy/core/durations'

// The admin dashboard. Two tabs: Create a new variant, Manage existing ones.
// All network calls go to `apiBase` (the @speakeasy/server admin API). Pass
// `title` / `subtitle` to relabel for your context. Wrap in <div className="sk-shell">
// is handled here; just render <AdminApp /> and import '@speakeasy/admin/admin.css'.
export default function AdminApp({
  apiBase = '/__speakeasy',
  title = 'Variants',
  subtitle = 'Local dashboard · changes persist and verify before going live',
}) {
  const items = useItems(apiBase)
  const [tab, setTab] = useState('create')
  const [createdAt, setCreatedAt] = useState(0)

  return (
    <div className="sk-shell">
      <header className="sk-header">
        <h1 className="sk-title">{title}</h1>
        <p className="sk-subtitle">{subtitle}</p>
        <Tabs
          options={[
            { label: 'Create', value: 'create' },
            { label: 'Manage', value: 'manage' },
          ]}
          defaultSelection="create"
          onChange={setTab}
        />
      </header>
      {/* Create stays mounted (just hidden) so its in-progress form — label,
          duration, item selection — survives switching to Manage and back. */}
      <div hidden={tab !== 'create'}>
        <CreateView apiBase={apiBase} items={items} onCreated={() => setCreatedAt(Date.now())} />
      </div>
      {tab === 'manage' && <ManageView key={createdAt} apiBase={apiBase} items={items} />}
    </div>
  )
}

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

async function sendJSON(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

function useItems(apiBase) {
  const [items, setItems] = useState([])
  useEffect(() => {
    getJSON(`${apiBase}/items`)
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
  }, [apiBase])
  return items
}

function DurationPicker({ value, onChange }) {
  return (
    <div className="sk-pill-row" role="group" aria-label="Duration">
      {DURATIONS.map((d) => (
        <button
          key={d.days ?? 'none'}
          type="button"
          className={`sk-pill ${value === d.days ? 'sk-pill-active' : ''}`}
          aria-pressed={value === d.days}
          onClick={() => onChange(d.days)}
        >
          {d.label}
        </button>
      ))}
    </div>
  )
}

function ItemToggles({ items, orderedIds, onToggle, onReorder }) {
  const selected = new Set(orderedIds)
  const selectedItems = orderedIds.map((id) => items.find((p) => p.id === id)).filter(Boolean)
  const unselectedItems = items.filter((p) => !selected.has(p.id))

  const dragIdx = useRef(null)
  const [overIdx, setOverIdx] = useState(null)

  function handleDragStart(e, i) {
    dragIdx.current = i
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleDragOver(e, i) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIdx(i)
  }
  function handleDrop(e, i) {
    e.preventDefault()
    if (dragIdx.current !== null && dragIdx.current !== i) onReorder(dragIdx.current, i)
    dragIdx.current = null
    setOverIdx(null)
  }
  function handleDragEnd() {
    dragIdx.current = null
    setOverIdx(null)
  }

  const meta = (p) =>
    `${p.visibility === 'private' ? 'Private' : 'Public'}${p.meta ? ` · ${p.meta}` : ''}`

  return (
    <ul className="sk-toggle-list">
      {selectedItems.map((p, i) => (
        <li
          key={p.id}
          className={`sk-toggle-row ${overIdx === i ? 'sk-toggle-row-dragover' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragEnd={handleDragEnd}
        >
          <span className="sk-drag-handle" aria-hidden="true" />
          <button
            type="button"
            className="sk-switch sk-switch-on"
            role="switch"
            aria-checked
            onClick={() => onToggle(p.id)}
          >
            <span className="sk-switch-knob" />
          </button>
          <span className="sk-toggle-text">
            <span className="sk-toggle-title">{p.title}</span>
            <span className="sk-toggle-meta">{meta(p)}</span>
          </span>
        </li>
      ))}
      {unselectedItems.map((p) => (
        <li key={p.id} className="sk-toggle-row">
          {/* Disabled handle: unselected items aren't in the ordered set, so they
              can't be reordered. Keeps the slot aligned and reads as inactive. */}
          <span className="sk-drag-handle sk-drag-handle-disabled" aria-hidden="true" />
          <button
            type="button"
            className="sk-switch"
            role="switch"
            aria-checked={false}
            onClick={() => onToggle(p.id)}
          >
            <span className="sk-switch-knob" />
          </button>
          <span className="sk-toggle-text">
            <span className="sk-toggle-title">{p.title}</span>
            <span className="sk-toggle-meta">{meta(p)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function defaultSelection(items) {
  return items.filter((p) => p.visibility === 'public').map((p) => p.id)
}

function CreateView({ apiBase, items, onCreated }) {
  const [label, setLabel] = useState('')
  const [durationDays, setDurationDays] = useState(DEFAULT_DURATION_DAYS)
  const [orderedIds, setOrderedIds] = useState([])
  const [phase, setPhase] = useState('idle') // idle | working | done | error
  const [result, setResult] = useState(null)

  useEffect(() => {
    setOrderedIds(defaultSelection(items))
  }, [items])

  const toggle = useCallback((id) => {
    setOrderedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }, [])

  const reorder = useCallback((fromIndex, toIndex) => {
    setOrderedIds((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  async function generate() {
    setPhase('working')
    setResult(null)
    try {
      const r = await sendJSON(`${apiBase}/variants`, 'POST', {
        label,
        items: orderedIds,
        durationDays,
      })
      setResult(r)
      setPhase(r.verified ? 'done' : 'error')
      onCreated?.()
    } catch (err) {
      setResult({ error: String(err) })
      setPhase('error')
    }
  }

  return (
    <div className="sk-panel">
      <label className="sk-field">
        <span className="sk-field-label">Label</span>
        <input
          className="sk-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Acme Inc - Spring 2026"
        />
      </label>

      <div className="sk-field">
        <span className="sk-field-label">Active for</span>
        <DurationPicker value={durationDays} onChange={setDurationDays} />
      </div>

      <div className="sk-field">
        <span className="sk-field-label">Included</span>
        <ItemToggles items={items} orderedIds={orderedIds} onToggle={toggle} onReorder={reorder} />
      </div>

      <button
        type="button"
        className="sk-primary"
        disabled={phase === 'working' || orderedIds.length === 0}
        onClick={generate}
      >
        {phase === 'working' ? 'Creating link…' : 'Create link'}
      </button>

      {phase === 'done' && result && (
        <div className="sk-result-ok">
          <span className="sk-result-label">Live and verified</span>
          <button
            type="button"
            className="sk-copy"
            onClick={() => navigator.clipboard?.writeText(result.url)}
          >
            {result.url}
          </button>
          <span className="sk-result-meta">Click to copy</span>
        </div>
      )}

      {result?.orphans?.length > 0 && (
        <div className="sk-result-warn">
          These ids don’t match any item and won’t appear: {result.orphans.join(', ')}
        </div>
      )}

      {phase === 'error' && result && (
        <div className="sk-result-err">
          {result.error
            ? `Failed: ${result.error}`
            : 'Persisted, but could not verify the URL went live within the timeout. Check the deploy before sending.'}
          {result.url && <div className="sk-result-meta">{result.url}</div>}
        </div>
      )}
    </div>
  )
}

const STATE_LABEL = { live: 'Live', expired: 'Expired', deactivated: 'Deactivated' }

function VariantRow({ apiBase, variant, items, onChanged }) {
  const [editing, setEditing] = useState(null) // null | 'duration' | 'items'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [orphans, setOrphans] = useState([])
  const [durationDays, setDurationDays] = useState(DEFAULT_DURATION_DAYS)
  const [orderedIds, setOrderedIds] = useState(() => [...variant.items])
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(variant.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function patch(body) {
    setBusy(true)
    setError(null)
    setOrphans([])
    try {
      const result = await sendJSON(
        `${apiBase}/variants/${encodeURIComponent(variant.slug)}`,
        'PATCH',
        body,
      )
      if (result?.error) {
        setError(`Failed: ${result.error}`)
        return
      }
      if (!result?.verified) {
        setError(
          'Persisted, but could not verify the change went live before the timeout. Check the deploy before relying on it.',
        )
        return
      }
      setOrphans(result.orphans ?? [])
      onChanged?.()
      setEditing(null)
    } catch (err) {
      setError(`Failed: ${String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const reorder = useCallback((fromIndex, toIndex) => {
    setOrderedIds((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  return (
    <li className="sk-variant-row">
      <div className="sk-variant-head">
        <div className="sk-variant-main">
          <span className={`sk-chip sk-chip-${variant.state}`}>
            {STATE_LABEL[variant.state]}
            {variant.state === 'live'
              ? variant.daysLeft == null || variant.daysLeft === Infinity
                ? ' · No expiry'
                : ` · ${variant.daysLeft}d left`
              : ''}
          </span>
          <span className="sk-variant-label">{variant.label || '(no label)'}</span>
          <span className="sk-variant-url">{variant.url}</span>
        </div>
        <div className="sk-variant-actions">
          <button type="button" className="sk-ghost" onClick={copyLink}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          {variant.active && (
            <button
              type="button"
              className="sk-ghost"
              disabled={busy}
              onClick={() => patch({ action: 'deactivate' })}
            >
              Deactivate
            </button>
          )}
          <button
            type="button"
            className="sk-ghost"
            disabled={busy}
            onClick={() => setEditing(editing === 'duration' ? null : 'duration')}
          >
            Change expiry
          </button>
          <button
            type="button"
            className="sk-ghost"
            disabled={busy}
            onClick={() => setEditing(editing === 'items' ? null : 'items')}
          >
            Edit items
          </button>
        </div>
      </div>

      {editing === 'duration' && (
        <div className="sk-edit-panel">
          <DurationPicker value={durationDays} onChange={setDurationDays} />
          <button
            type="button"
            className="sk-primary-sm"
            disabled={busy}
            onClick={() => patch({ action: 'setDuration', durationDays })}
          >
            {busy ? 'Saving…' : 'Save expiry'}
          </button>
        </div>
      )}

      {editing === 'items' && (
        <div className="sk-edit-panel">
          <ItemToggles
            items={items}
            orderedIds={orderedIds}
            onToggle={(id) =>
              setOrderedIds((prev) =>
                prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
              )
            }
            onReorder={reorder}
          />
          <button
            type="button"
            className="sk-primary-sm"
            disabled={busy || orderedIds.length === 0}
            onClick={() => patch({ action: 'setItems', items: orderedIds })}
          >
            {busy ? 'Saving…' : 'Save items'}
          </button>
        </div>
      )}

      {error && <div className="sk-result-err">{error}</div>}
      {orphans.length > 0 && (
        <div className="sk-result-warn">
          These ids don’t match any item and won’t appear: {orphans.join(', ')}
        </div>
      )}
    </li>
  )
}

function ManageView({ apiBase, items }) {
  const [variants, setVariants] = useState([])
  const [filter, setFilter] = useState('live') // live | all

  const load = useCallback(() => {
    getJSON(`${apiBase}/variants`)
      .then((d) => setVariants(d.variants ?? []))
      .catch(() => setVariants([]))
  }, [apiBase])

  useEffect(() => {
    load()
  }, [load])

  const shown = filter === 'live' ? variants.filter((v) => v.state === 'live') : variants

  return (
    <div className="sk-panel">
      <Tabs
        options={[
          { label: 'Live', value: 'live' },
          { label: 'All', value: 'all' },
        ]}
        defaultSelection="live"
        onChange={setFilter}
      />
      {shown.length === 0 ? (
        <p className="sk-empty">{filter === 'live' ? 'No live variants.' : 'No variants yet.'}</p>
      ) : (
        <ul className="sk-variant-list">
          {shown.map((v) => (
            <VariantRow key={v.slug} apiBase={apiBase} variant={v} items={items} onChanged={load} />
          ))}
        </ul>
      )}
    </div>
  )
}
