import { Router } from 'express'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SETTINGS_FILE = join(__dirname, '../data/settings.json')

export function readSettings() {
  return JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'))
}

export function writeSettings(data) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2))
}

const router = Router()

router.get('/', (req, res) => {
  res.json(readSettings())
})

router.put('/', (req, res) => {
  const current = readSettings()
  const updated = deepMerge(current, req.body)
  writeSettings(updated)
  res.json(updated)
})

router.get('/status', (req, res) => {
  const s = readSettings()
  res.json({
    claude: { connected: !!s.claude.api_key },
    slack: { connected: !!s.slack.webhook_url, daily_briefing: s.slack.daily_briefing_enabled },
    notion: { connected: !!(s.notion.api_key && s.notion.contacts_db_id) },
    google: { connected: !!(s.google.access_token && s.google.refresh_token), email: s.google.connected_email },
  })
})

function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

export default router
