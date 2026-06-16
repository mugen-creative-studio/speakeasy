// Load speakeasy.config.js from the project root (or an explicit --config path).
// The config is a plain ESM module default-exporting the object createContext
// expects (see server/src/context.js).

import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import path from 'node:path'

const DEFAULT_NAMES = ['speakeasy.config.js', 'speakeasy.config.mjs']

export async function loadConfig({ root = process.cwd(), configPath } = {}) {
  let abs
  if (configPath) {
    abs = path.isAbsolute(configPath) ? configPath : path.join(root, configPath)
  } else {
    abs = DEFAULT_NAMES.map((n) => path.join(root, n)).find((p) => existsSync(p))
  }
  if (!abs || !existsSync(abs)) {
    throw new Error(
      `No speakeasy config found. Create speakeasy.config.js in ${root}, or pass --config <path>.`,
    )
  }
  const mod = await import(pathToFileURL(abs).href)
  const config = mod.default ?? mod.config
  if (!config || typeof config !== 'object') {
    throw new Error(`${abs} must default-export a config object`)
  }
  return config
}
