import { Client } from '@notionhq/client'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MAP_FILE = join(__dirname, '../data/notion_map.json')

function readMap() {
  return JSON.parse(readFileSync(MAP_FILE, 'utf8'))
}
function writeMap(data) {
  writeFileSync(MAP_FILE, JSON.stringify(data, null, 2))
}

function safeText(val) {
  return [{ type: 'text', text: { content: String(val || '').slice(0, 2000) } }]
}

function buildContactProperties(contact) {
  const props = {
    Name: { title: safeText(contact.name) },
  }
  if (contact.role !== undefined) props['Role'] = { rich_text: safeText(contact.role) }
  if (contact.company !== undefined) props['Company'] = { rich_text: safeText(contact.company) }
  if (contact.warmth !== undefined) props['Warmth'] = { select: { name: contact.warmth } }
  if (contact.last_touched) props['Last Touched'] = { date: { start: contact.last_touched.slice(0, 10) } }
  if (contact.email) props['Email'] = { email: contact.email }
  if (contact.notes !== undefined) props['Notes'] = { rich_text: safeText(contact.notes) }
  if (contact.tags && contact.tags.length > 0) {
    props['Tags'] = { multi_select: contact.tags.map(t => ({ name: t })) }
  }
  if (contact.at_risk !== undefined) props['At Risk'] = { checkbox: !!contact.at_risk }
  return props
}

export async function syncContact(apiKey, dbId, contact) {
  const notion = new Client({ auth: apiKey })
  const map = readMap()

  const properties = buildContactProperties(contact)

  try {
    if (map[contact.id]) {
      // Update existing page
      await notion.pages.update({
        page_id: map[contact.id],
        properties,
      })
      return { action: 'updated', page_id: map[contact.id] }
    } else {
      // Create new page
      const page = await notion.pages.create({
        parent: { database_id: dbId },
        properties,
      })
      map[contact.id] = page.id
      writeMap(map)
      return { action: 'created', page_id: page.id }
    }
  } catch (err) {
    // If page was deleted in Notion, create a new one
    if (err.code === 'object_not_found') {
      const page = await notion.pages.create({
        parent: { database_id: dbId },
        properties,
      })
      map[contact.id] = page.id
      writeMap(map)
      return { action: 'recreated', page_id: page.id }
    }
    throw err
  }
}

export async function syncAllContacts(apiKey, dbId, contacts) {
  const results = []
  for (const contact of contacts) {
    try {
      const result = await syncContact(apiKey, dbId, contact)
      results.push({ id: contact.id, name: contact.name, ...result })
    } catch (err) {
      results.push({ id: contact.id, name: contact.name, error: err.message })
    }
  }
  return results
}
