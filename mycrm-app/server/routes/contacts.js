import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { read, write } from '../db.js'
import { enrichContact } from '../warmth.js'

const router = Router()

router.get('/', (req, res) => {
  const contacts = read('contacts')
  const interactions = read('interactions')
  const opportunities = read('opportunities')
  const enriched = contacts.map(c => enrichContact(c, interactions, opportunities))
  res.json(enriched)
})

router.get('/:id', (req, res) => {
  const contacts = read('contacts')
  const contact = contacts.find(c => c.id === req.params.id)
  if (!contact) return res.status(404).json({ error: 'Not found' })
  const interactions = read('interactions')
  const opportunities = read('opportunities')
  res.json(enrichContact(contact, interactions, opportunities))
})

router.post('/', (req, res) => {
  const contacts = read('contacts')
  const newContact = {
    id: uuid(),
    name: '',
    role: '',
    company: '',
    source: '',
    warmth: 'cold',
    last_touched: null,
    tags: [],
    linkedin_url: '',
    notes: '',
    created_at: new Date().toISOString(),
    ...req.body,
  }
  contacts.push(newContact)
  write('contacts', contacts)
  res.status(201).json(newContact)
})

router.put('/:id', (req, res) => {
  const contacts = read('contacts')
  const idx = contacts.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  contacts[idx] = { ...contacts[idx], ...req.body, id: req.params.id }
  write('contacts', contacts)
  const interactions = read('interactions')
  const opportunities = read('opportunities')
  res.json(enrichContact(contacts[idx], interactions, opportunities))
})

router.delete('/:id', (req, res) => {
  const contacts = read('contacts')
  const filtered = contacts.filter(c => c.id !== req.params.id)
  write('contacts', filtered)
  res.json({ ok: true })
})

export default router
