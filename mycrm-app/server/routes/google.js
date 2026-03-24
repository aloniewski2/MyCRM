import { Router } from 'express'
import { read } from '../db.js'
import { readSettings, writeSettings } from './settings.js'
import {
  createOAuthClient, getAuthUrl, setCredentials,
  exchangeCode, getConnectedEmail,
  getGmailDataForContact, getCalendarEventsForContact,
} from '../integrations/google.js'

const router = Router()

function getClient() {
  const s = readSettings()
  if (!s.google.client_id || !s.google.client_secret) return null
  const client = createOAuthClient(s.google.client_id, s.google.client_secret)
  if (s.google.access_token) {
    setCredentials(client, s)
    // Save refreshed tokens automatically
    client.on('tokens', tokens => {
      const current = readSettings()
      if (tokens.access_token) current.google.access_token = tokens.access_token
      if (tokens.expiry_date) current.google.token_expiry = tokens.expiry_date
      writeSettings(current)
    })
  }
  return client
}

router.get('/auth', (req, res) => {
  const s = readSettings()
  if (!s.google.client_id || !s.google.client_secret) {
    return res.status(400).send('Google Client ID and Secret not configured. Add them in Settings first.')
  }
  const client = createOAuthClient(s.google.client_id, s.google.client_secret)
  const url = getAuthUrl(client)
  res.redirect(url)
})

router.get('/callback', async (req, res) => {
  const { code, error } = req.query
  if (error) return res.redirect('http://localhost:5173?google_error=1')

  try {
    const s = readSettings()
    const client = createOAuthClient(s.google.client_id, s.google.client_secret)
    const tokens = await exchangeCode(client, code)
    client.setCredentials(tokens)

    const email = await getConnectedEmail(client)

    s.google.access_token = tokens.access_token
    s.google.refresh_token = tokens.refresh_token || s.google.refresh_token
    s.google.token_expiry = tokens.expiry_date
    s.google.connected_email = email
    writeSettings(s)

    res.redirect('http://localhost:5173?google_connected=1')
  } catch (err) {
    console.error('Google OAuth error:', err.message)
    res.redirect('http://localhost:5173?google_error=1')
  }
})

router.get('/status', (req, res) => {
  const s = readSettings()
  res.json({
    connected: !!(s.google.access_token && s.google.refresh_token),
    email: s.google.connected_email,
    has_credentials: !!(s.google.client_id && s.google.client_secret),
  })
})

router.delete('/disconnect', (req, res) => {
  const s = readSettings()
  s.google.access_token = null
  s.google.refresh_token = null
  s.google.token_expiry = null
  s.google.connected_email = null
  writeSettings(s)
  res.json({ ok: true })
})

router.get('/gmail/:contactId', async (req, res) => {
  try {
    const client = getClient()
    if (!client) return res.status(400).json({ error: 'Google not configured.' })
    const s = readSettings()
    if (!s.google.access_token) return res.status(400).json({ error: 'Google not connected. Authorize in Settings.' })

    const contacts = read('contacts')
    const contact = contacts.find(c => c.id === req.params.contactId)
    if (!contact) return res.status(404).json({ error: 'Contact not found' })
    if (!contact.email) return res.status(400).json({ error: 'Contact has no email address. Add one to the contact.' })

    const data = await getGmailDataForContact(client, contact.email)
    res.json(data)
  } catch (err) {
    console.error('Gmail error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/calendar/:contactId', async (req, res) => {
  try {
    const client = getClient()
    if (!client) return res.status(400).json({ error: 'Google not configured.' })
    const s = readSettings()
    if (!s.google.access_token) return res.status(400).json({ error: 'Google not connected. Authorize in Settings.' })

    const contacts = read('contacts')
    const contact = contacts.find(c => c.id === req.params.contactId)
    if (!contact) return res.status(404).json({ error: 'Contact not found' })

    const data = await getCalendarEventsForContact(client, contact.email, contact.name)
    res.json(data)
  } catch (err) {
    console.error('Calendar error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
