import { Router } from 'express'
import { read } from '../db.js'
import { readSettings } from './settings.js'
import { syncContact, syncAllContacts } from '../integrations/notion.js'

const router = Router()

router.post('/sync', async (req, res) => {
  try {
    const settings = readSettings()
    if (!settings.notion.api_key || !settings.notion.contacts_db_id) {
      return res.status(400).json({ error: 'Notion API key and database ID required. Configure in Settings.' })
    }
    const contacts = read('contacts')
    const results = await syncAllContacts(settings.notion.api_key, settings.notion.contacts_db_id, contacts)
    const succeeded = results.filter(r => !r.error).length
    const failed = results.filter(r => r.error).length
    res.json({ ok: true, synced: succeeded, failed, results })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/sync/:contactId', async (req, res) => {
  try {
    const settings = readSettings()
    if (!settings.notion.api_key || !settings.notion.contacts_db_id) {
      return res.status(400).json({ error: 'Notion not configured.' })
    }
    const contacts = read('contacts')
    const contact = contacts.find(c => c.id === req.params.contactId)
    if (!contact) return res.status(404).json({ error: 'Contact not found' })
    const result = await syncContact(settings.notion.api_key, settings.notion.contacts_db_id, contact)
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
