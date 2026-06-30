#!/usr/bin/env node
// speakeasy CLI. JSON to stdout by default (agent-friendly); pass --pretty for a
// human-readable rendering. Non-zero exit on error, with { error } on stdout.
//
//   speakeasy items
//   speakeasy create --label "Acme - Spring" --items a,b,c --duration 30
//   speakeasy list [--all]
//   speakeasy deactivate <slug>
//   speakeasy set-duration <slug> --duration 7      (--duration none = no expiry)
//   speakeasy set-items <slug> --items a,b,c
//   speakeasy lookup <slug>
//
// Common flags: --config <path>, --pretty, --root <dir>

import {
  createContext,
  handleListItems,
  handleListVariants,
  handleCreate,
  handlePatch,
  handleLookup,
} from '@speakeasy/server'
import { loadConfig } from '../src/config.js'

function parseArgs(argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      positional.push(a)
    }
  }
  return { positional, flags }
}

function parseDuration(raw) {
  if (raw === undefined) return undefined
  if (raw === 'none' || raw === 'null' || raw === false) return null
  const n = Number(raw)
  if (Number.isNaN(n))
    throw new Error(`--duration must be a number of days or "none", got "${raw}"`)
  return n
}

function parseItems(raw) {
  if (raw === undefined || raw === true) return []
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function out(data, pretty) {
  if (pretty) {
    process.stdout.write(renderPretty(data) + '\n')
  } else {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n')
  }
}

function renderPretty(data) {
  if (Array.isArray(data?.variants)) {
    if (!data.variants.length) return '(no variants)'
    return data.variants
      .map((v) => {
        const expiry = Number.isFinite(v.daysLeft) ? `${v.daysLeft}d left` : 'no expiry'
        return `[${v.state}] ${v.label || '(no label)'}\n  ${v.url}\n  ${v.items.length} item(s)${v.state === 'live' ? ` · ${expiry}` : ''}`
      })
      .join('\n\n')
  }
  // A create/patch result carries slug + url (its `items` are bare id strings,
  // so this must come before the content-list branch below).
  if (data?.slug && data?.url) {
    const lines = [`${data.verified ? '✓' : '⚠'} ${data.state}  ${data.url}`]
    if (data.orphans?.length)
      lines.push(`  orphaned ids (won't appear): ${data.orphans.join(', ')}`)
    if (!data.verified) lines.push('  could not verify the change went live before the timeout')
    return lines.join('\n')
  }
  // The content list: `items` are objects { id, title, visibility, meta }.
  if (Array.isArray(data?.items)) {
    if (!data.items.length) return '(no items)'
    return data.items
      .map(
        (i) =>
          `${i.visibility === 'private' ? '🔒' : '  '} ${i.id}  ${i.title}${i.meta ? ` · ${i.meta}` : ''}`,
      )
      .join('\n')
  }
  return JSON.stringify(data, null, 2)
}

async function main() {
  // Parse everything first so global flags (--root, --config, --pretty) may
  // appear anywhere - before or after the command and its arguments.
  const { positional, flags } = parseArgs(process.argv.slice(2))
  const [command, ...args] = positional
  const pretty = Boolean(flags.pretty)

  if (!command || command === 'help' || flags.help) {
    process.stdout.write(HELP + '\n')
    return
  }

  const root = flags.root ? String(flags.root) : process.cwd()
  const config = await loadConfig({
    root,
    configPath: flags.config ? String(flags.config) : undefined,
  })
  const ctx = createContext(config, { root })

  switch (command) {
    case 'items':
      return out(await handleListItems(ctx), pretty)

    case 'list':
    case 'ls': {
      const all = await handleListVariants(ctx)
      const variants = flags.all ? all.variants : all.variants.filter((v) => v.state === 'live')
      return out({ variants }, pretty)
    }

    case 'create': {
      const result = await handleCreate(ctx, {
        label: flags.label ? String(flags.label) : '',
        items: parseItems(flags.items),
        durationDays: parseDuration(flags.duration) ?? undefined,
      })
      return out(result, pretty)
    }

    case 'deactivate': {
      const slug = requireSlug(args)
      return out(await handlePatch(ctx, slug, { action: 'deactivate' }), pretty)
    }

    case 'set-duration': {
      const slug = requireSlug(args)
      return out(
        await handlePatch(ctx, slug, {
          action: 'setDuration',
          durationDays: parseDuration(flags.duration),
        }),
        pretty,
      )
    }

    case 'set-items': {
      const slug = requireSlug(args)
      return out(
        await handlePatch(ctx, slug, { action: 'setItems', items: parseItems(flags.items) }),
        pretty,
      )
    }

    case 'lookup': {
      const slug = requireSlug(args)
      const { status, body } = await handleLookup(ctx, slug)
      return out({ status, ...body }, pretty)
    }

    default:
      throw new Error(`Unknown command "${command}". Run "speakeasy help".`)
  }
}

function requireSlug(args) {
  const slug = args[0]
  if (!slug) throw new Error('This command needs a <slug> argument.')
  return slug
}

const HELP = `speakeasy - confidential content variants

Usage:
  speakeasy items                                 list available content items
  speakeasy create --label <l> --items a,b,c [--duration <days|none>]
  speakeasy list [--all]                          live variants (or all)
  speakeasy deactivate <slug>
  speakeasy set-duration <slug> --duration <days|none>
  speakeasy set-items <slug> --items a,b,c
  speakeasy lookup <slug>                          what a visitor would receive

Flags:
  --config <path>   config file (default: ./speakeasy.config.js)
  --root <dir>      project root (default: cwd)
  --pretty          human-readable output instead of JSON`

main().catch((err) => {
  process.stdout.write(JSON.stringify({ error: String(err?.message || err) }, null, 2) + '\n')
  process.exitCode = 1
})
