import { Router } from 'express'
import { read } from '../db.js'
import { readSettings } from './settings.js'
import { testImapConnection, getEmailsForContact, getRecentThreads } from '../integrations/imap.js'

const router = Router()

router.get('/status', async (req, res) => {
  const s = readSettings()
  const configured = !!(s.imap.host && s.imap.email && s.imap.password)
  if (!configured) return res.json({ connected: false, configured: false })

  try {
    await testImapConnection(s.imap)
    res.json({ connected: true, configured: true, email: s.imap.email })
  } catch (err) {
    res.json({ connected: false, configured: true, error: err.message })
  }
})

router.post('/test', async (req, res) => {
  const s = readSettings()
  if (!s.imap.host || !s.imap.email || !s.imap.password) {
    return res.status(400).json({ error: 'IMAP not fully configured.' })
  }
  try {
    await testImapConnection(s.imap)
    res.json({ ok: true, message: `Connected to ${s.imap.host} as ${s.imap.email}` })
  } catch (err) {
    res.status(400).json({ error: `Connection failed: ${err.message}` })
  }
})

router.get('/contact/:contactId', async (req, res) => {
  try {
    const s = readSettings()
    if (!s.imap.host || !s.imap.email || !s.imap.password) {
      return res.status(400).json({ error: 'IMAP not configured. Add it in Settings → Email.' })
    }

    const contacts = read('contacts')
    const contact = contacts.find(c => c.id === req.params.contactId)
    if (!contact) return res.status(404).json({ error: 'Contact not found' })
    if (!contact.email) return res.status(400).json({ error: 'Contact has no email address. Add one to the contact first.' })

    const data = await getEmailsForContact(s.imap, contact.email)
    res.json(data)
  } catch (err) {
    console.error('IMAP error:', err.message)
    res.status(500).json({ error: `IMAP error: ${err.message}` })
  }
})

router.get('/contact/:contactId/threads', async (req, res) => {
  try {
    const s = readSettings()
    if (!s.imap.host || !s.imap.email || !s.imap.password) {
      return res.status(400).json({ error: 'IMAP not configured.' })
    }
    const contacts = read('contacts')
    const contact = contacts.find(c => c.id === req.params.contactId)
    if (!contact?.email) return res.status(400).json({ error: 'Contact has no email address.' })

    const threads = await getRecentThreads(s.imap, contact.email)
    res.json(threads)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
