import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')

const FILES = {
  contacts: join(DATA_DIR, 'contacts.json'),
  opportunities: join(DATA_DIR, 'opportunities.json'),
  interactions: join(DATA_DIR, 'interactions.json'),
  tasks: join(DATA_DIR, 'tasks.json'),
  notes: join(DATA_DIR, 'notes.json'),
}

function read(entity) {
  if (!existsSync(FILES[entity])) return []
  return JSON.parse(readFileSync(FILES[entity], 'utf8'))
}

function write(entity, data) {
  writeFileSync(FILES[entity], JSON.stringify(data, null, 2))
}

export { read, write }
