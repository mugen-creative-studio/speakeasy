// The standalone admin dashboard, in plain browser JavaScript - no React, no
// build step. It talks to the same admin API the React dashboard uses (the one
// `speakeasy admin` mounts under /__speakeasy), so behavior matches; this is
// just a dependency-free rendering of it. Styling is shared: it reuses the same
// .sk-* classes from @speakeasy/admin's admin.css.

const API = '/__speakeasy'
const DEFAULT_DURATION_DAYS = 30
// Mirrors DURATIONS in @speakeasy/core/durations (kept in sync by hand; the
// browser can't import the node module here).
const DURATIONS = [
  { label: '1 day', days: 1 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '2 months', days: 60 },
  { label: 'No expiry', days: null },
]

// Tiny DOM builder. `props` handles class/text, on* listeners, and attributes.
function el(tag, props, ...kids) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'class') node.className = v
    else if (k === 'text') node.textContent = v
    else if (k.startsWith('on') && typeof v === 'function')
      node.addEventListener(k.slice(2).toLowerCase(), v)
    else node.setAttribute(k, v === true ? '' : v)
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined) continue
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)))
  }
  return node
}

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(String(res.status))
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

function field(labelText, control) {
  return el(
    'div',
    { class: 'sk-field' },
    el('span', { class: 'sk-field-label', text: labelText }),
    control,
  )
}

function copyToClipboard(text) {
  if (navigator.clipboard) navigator.clipboard.writeText(text)
}

// Segmented control with a sliding highlight, matching the React <Tabs>.
function makeTabs(options, initialValue, onChange) {
  let activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === initialValue),
  )
  const btns = []
  const hover = el('div', { class: 'sk-tabs-hover' })
  const active = el('div', { class: 'sk-tabs-active' })
  const container = el('div', { class: 'sk-tabs', role: 'group' }, hover, active)
  options.forEach((o, i) => {
    const b = el('button', {
      class: 'sk-tabs-btn',
      type: 'button',
      onClick: () => select(i),
      onMouseenter: () => moveHover(i),
      onMouseleave: hideHover,
    })
    b.textContent = o.label
    btns.push(b)
    container.append(b)
  })
  const overlay = el(
    'div',
    { class: 'sk-tabs-overlay', 'aria-hidden': 'true' },
    options.map((o) => el('span', { class: 'sk-tabs-overlay-label', text: o.label })),
  )
  container.append(overlay)

  function pos(i) {
    const c = container.getBoundingClientRect()
    const r = btns[i].getBoundingClientRect()
    return { left: r.left - c.left - 1, width: r.width }
  }
  function positionActive() {
    const { left, width } = pos(activeIndex)
    if (!width) return
    active.style.width = width + 'px'
    active.style.transform = `translateX(${left}px)`
    overlay.style.clipPath = `inset(2px calc(100% - ${left + width}px) 2px ${left}px round var(--radius-round))`
  }
  function moveHover(i) {
    if (i === activeIndex) return hideHover()
    const { left, width } = pos(i)
    hover.style.width = width + 'px'
    hover.style.transform = `translateX(${left}px)`
    hover.classList.add('sk-tabs-hover-visible')
  }
  function hideHover() {
    hover.classList.remove('sk-tabs-hover-visible')
  }
  function select(i) {
    activeIndex = i
    positionActive()
    onChange(options[i].value)
  }

  requestAnimationFrame(positionActive)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(positionActive)
  window.addEventListener('resize', positionActive)
  return container
}

function makeDurationPicker(initial, onChange) {
  let value = initial
  const row = el('div', { class: 'sk-pill-row', role: 'group', 'aria-label': 'Duration' })
  function render() {
    row.replaceChildren(
      ...DURATIONS.map((d) => {
        const b = el('button', {
          type: 'button',
          class: 'sk-pill' + (value === d.days ? ' sk-pill-active' : ''),
          'aria-pressed': value === d.days ? 'true' : 'false',
          onClick: () => {
            value = d.days
            onChange(d.days)
            render()
          },
        })
        b.textContent = d.label
        return b
      }),
    )
  }
  render()
  return row
}

// Toggle + drag-reorder list. The parent owns the ordered id array via
// getIds/setIds; selected ids render first (in order, draggable), the rest
// follow as off switches.
function makeItemToggles(items, getIds, setIds) {
  const list = el('ul', { class: 'sk-toggle-list' })
  let dragIdx = null

  const metaLine = (p) =>
    (p.visibility === 'private' ? 'Private' : 'Public') + (p.meta ? ` · ${p.meta}` : '')

  function toggle(id) {
    const ids = getIds()
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
    render()
  }
  function reorder(from, to) {
    const ids = [...getIds()]
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    setIds(ids)
    render()
  }

  function row(p, selected, index) {
    const li = el('li', { class: 'sk-toggle-row' })
    const handle = el('span', {
      class: 'sk-drag-handle' + (selected ? '' : ' sk-drag-handle-disabled'),
      'aria-hidden': 'true',
    })
    const sw = el(
      'button',
      {
        type: 'button',
        class: 'sk-switch' + (selected ? ' sk-switch-on' : ''),
        role: 'switch',
        'aria-checked': selected ? 'true' : 'false',
        onClick: () => toggle(p.id),
      },
      el('span', { class: 'sk-switch-knob' }),
    )
    const text = el(
      'span',
      { class: 'sk-toggle-text' },
      el('span', { class: 'sk-toggle-title', text: p.title }),
      el('span', { class: 'sk-toggle-meta', text: metaLine(p) }),
    )
    li.append(handle, sw, text)
    if (selected) {
      li.setAttribute('draggable', 'true')
      li.addEventListener('dragstart', (e) => {
        dragIdx = index
        e.dataTransfer.effectAllowed = 'move'
      })
      li.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        li.classList.add('sk-toggle-row-dragover')
      })
      li.addEventListener('dragleave', () => li.classList.remove('sk-toggle-row-dragover'))
      li.addEventListener('drop', (e) => {
        e.preventDefault()
        li.classList.remove('sk-toggle-row-dragover')
        if (dragIdx !== null && dragIdx !== index) reorder(dragIdx, index)
        dragIdx = null
      })
      li.addEventListener('dragend', () => {
        dragIdx = null
        li.classList.remove('sk-toggle-row-dragover')
      })
    }
    return li
  }

  function render() {
    const ids = getIds()
    const selected = new Set(ids)
    const selectedItems = ids.map((id) => items.find((p) => p.id === id)).filter(Boolean)
    const unselected = items.filter((p) => !selected.has(p.id))
    list.replaceChildren(
      ...selectedItems.map((p, i) => row(p, true, i)),
      ...unselected.map((p) => row(p, false, -1)),
    )
  }
  render()
  return { el: list, render }
}

function makeCreateView(items, onCreated) {
  let label = ''
  let durationDays = DEFAULT_DURATION_DAYS
  let orderedIds = items.filter((p) => p.visibility === 'public').map((p) => p.id)
  let working = false

  const input = el('input', {
    class: 'sk-input',
    placeholder: 'Acme Inc - Spring 2026',
    onInput: (e) => {
      label = e.target.value
    },
  })
  const duration = makeDurationPicker(durationDays, (v) => {
    durationDays = v
  })
  const toggles = makeItemToggles(
    items,
    () => orderedIds,
    (ids) => {
      orderedIds = ids
      syncButton()
    },
  )
  const btn = el('button', { class: 'sk-primary', type: 'button', onClick: generate })
  btn.textContent = 'Create link'
  const resultBox = el('div')

  function syncButton() {
    btn.disabled = working || orderedIds.length === 0
  }

  function showResult(r) {
    const kids = []
    if (r.verified && r.url) {
      const copy = el('button', {
        class: 'sk-copy',
        type: 'button',
        onClick: () => copyToClipboard(r.url),
      })
      copy.textContent = r.url
      kids.push(
        el(
          'div',
          { class: 'sk-result-ok' },
          el('span', { class: 'sk-result-label', text: 'Live and verified' }),
          copy,
          el('span', { class: 'sk-result-meta', text: 'Click to copy' }),
        ),
      )
    } else if (!r.error && r.url) {
      kids.push(
        el(
          'div',
          { class: 'sk-result-err' },
          'Persisted, but could not verify the URL went live within the timeout. Check the deploy before sending.',
          el('div', { class: 'sk-result-meta', text: r.url }),
        ),
      )
    } else if (r.error) {
      kids.push(el('div', { class: 'sk-result-err', text: 'Failed: ' + r.error }))
    }
    if (r.orphans && r.orphans.length) {
      kids.push(
        el('div', {
          class: 'sk-result-warn',
          text: 'These ids don’t match any item and won’t appear: ' + r.orphans.join(', '),
        }),
      )
    }
    resultBox.replaceChildren(...kids)
  }

  async function generate() {
    working = true
    btn.textContent = 'Creating link…'
    syncButton()
    resultBox.replaceChildren()
    try {
      const r = await sendJSON(`${API}/variants`, 'POST', {
        label,
        items: orderedIds,
        durationDays,
      })
      showResult(r)
      if (onCreated) onCreated()
    } catch (err) {
      showResult({ error: String(err) })
    }
    working = false
    btn.textContent = 'Create link'
    syncButton()
  }

  const panel = el(
    'div',
    { class: 'sk-panel' },
    field('Label', input),
    field('Active for', duration),
    field('Included', toggles.el),
    btn,
    resultBox,
  )
  syncButton()
  return panel
}

const STATE_LABEL = { live: 'Live', expired: 'Expired', deactivated: 'Deactivated' }

function makeVariantRow(variant, items, onChanged) {
  let editing = null
  let durationDays = DEFAULT_DURATION_DAYS
  let orderedIds = [...variant.items]

  const editWrap = el('div')
  const msgWrap = el('div')

  const chipText =
    STATE_LABEL[variant.state] +
    (variant.state === 'live'
      ? variant.daysLeft == null || variant.daysLeft === Infinity
        ? ' · No expiry'
        : ` · ${variant.daysLeft}d left`
      : '')

  const copyBtn = el('button', { class: 'sk-ghost', type: 'button', onClick: copyLink })
  copyBtn.textContent = 'Copy link'
  function copyLink() {
    copyToClipboard(variant.url)
    copyBtn.textContent = 'Copied!'
    setTimeout(() => (copyBtn.textContent = 'Copy link'), 2000)
  }

  const actions = el('div', { class: 'sk-variant-actions' }, copyBtn)
  if (variant.active) {
    const d = el('button', {
      class: 'sk-ghost',
      type: 'button',
      onClick: () => patch({ action: 'deactivate' }),
    })
    d.textContent = 'Deactivate'
    actions.append(d)
  }
  const expiryBtn = el('button', {
    class: 'sk-ghost',
    type: 'button',
    onClick: () => toggleEdit('duration'),
  })
  expiryBtn.textContent = 'Change expiry'
  const itemsBtn = el('button', {
    class: 'sk-ghost',
    type: 'button',
    onClick: () => toggleEdit('items'),
  })
  itemsBtn.textContent = 'Edit items'
  actions.append(expiryBtn, itemsBtn)

  const head = el(
    'div',
    { class: 'sk-variant-head' },
    el(
      'div',
      { class: 'sk-variant-main' },
      el('span', { class: `sk-chip sk-chip-${variant.state}`, text: chipText }),
      el('span', { class: 'sk-variant-label', text: variant.label || '(no label)' }),
      el('span', { class: 'sk-variant-url', text: variant.url }),
    ),
    actions,
  )

  function toggleEdit(which) {
    editing = editing === which ? null : which
    renderEdit()
  }
  function renderEdit() {
    editWrap.replaceChildren()
    if (editing === 'duration') {
      const picker = makeDurationPicker(durationDays, (v) => (durationDays = v))
      const save = el('button', {
        class: 'sk-primary-sm',
        type: 'button',
        onClick: () => patch({ action: 'setDuration', durationDays }),
      })
      save.textContent = 'Save expiry'
      editWrap.append(el('div', { class: 'sk-edit-panel' }, picker, save))
    } else if (editing === 'items') {
      orderedIds = [...variant.items]
      const tog = makeItemToggles(
        items,
        () => orderedIds,
        (ids) => (orderedIds = ids),
      )
      const save = el('button', {
        class: 'sk-primary-sm',
        type: 'button',
        onClick: () => patch({ action: 'setItems', items: orderedIds }),
      })
      save.textContent = 'Save items'
      editWrap.append(el('div', { class: 'sk-edit-panel' }, tog.el, save))
    }
  }

  function showMsg(kind, text) {
    msgWrap.replaceChildren(
      el('div', { class: kind === 'warn' ? 'sk-result-warn' : 'sk-result-err', text }),
    )
  }

  async function patch(body) {
    msgWrap.replaceChildren()
    try {
      const result = await sendJSON(
        `${API}/variants/${encodeURIComponent(variant.slug)}`,
        'PATCH',
        body,
      )
      if (result && result.error) return showMsg('err', 'Failed: ' + result.error)
      if (!result || !result.verified)
        return showMsg(
          'err',
          'Persisted, but could not verify the change went live before the timeout. Check the deploy before relying on it.',
        )
      if (result.orphans && result.orphans.length)
        showMsg(
          'warn',
          'These ids don’t match any item and won’t appear: ' + result.orphans.join(', '),
        )
      if (onChanged) onChanged()
    } catch (err) {
      showMsg('err', 'Failed: ' + String(err))
    }
  }

  return el('li', { class: 'sk-variant-row' }, head, editWrap, msgWrap)
}

function makeManageView(items) {
  let filter = 'live'
  let variants = []
  const listWrap = el('div')
  const tabs = makeTabs(
    [
      { label: 'Live', value: 'live' },
      { label: 'All', value: 'all' },
    ],
    'live',
    (v) => {
      filter = v
      renderList()
    },
  )

  function renderList() {
    const shown = filter === 'live' ? variants.filter((v) => v.state === 'live') : variants
    if (!shown.length) {
      listWrap.replaceChildren(
        el('p', {
          class: 'sk-empty',
          text: filter === 'live' ? 'No live variants.' : 'No variants yet.',
        }),
      )
      return
    }
    listWrap.replaceChildren(
      el('ul', { class: 'sk-variant-list' }, ...shown.map((v) => makeVariantRow(v, items, load))),
    )
  }
  async function load() {
    try {
      const d = await getJSON(`${API}/variants`)
      variants = d.variants || []
    } catch {
      variants = []
    }
    renderList()
  }
  load()
  return el('div', { class: 'sk-panel' }, tabs, listWrap)
}

async function main() {
  const root = document.getElementById('root')
  let items = []
  try {
    const d = await getJSON(`${API}/items`)
    items = d.items || []
  } catch {
    items = []
  }

  const body = el('div')
  const createView = makeCreateView(items, () => {})
  const header = el(
    'header',
    { class: 'sk-header' },
    el('h1', { class: 'sk-title', text: 'Variants' }),
    el('p', {
      class: 'sk-subtitle',
      text: 'Local dashboard · changes persist and verify before going live',
    }),
  )
  const tabs = makeTabs(
    [
      { label: 'Create', value: 'create' },
      { label: 'Manage', value: 'manage' },
    ],
    'create',
    (v) => {
      // Create keeps its node (so an in-progress form survives a round trip);
      // Manage is rebuilt each open so it always shows fresh variants.
      body.replaceChildren(v === 'create' ? createView : makeManageView(items))
    },
  )
  header.append(tabs)
  body.replaceChildren(createView)
  root.replaceChildren(header, body)
}

main()
