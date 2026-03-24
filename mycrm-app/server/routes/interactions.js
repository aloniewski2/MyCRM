import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { read, write } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const interactions = read('interactions')
  const { contact, opportunity } = req.query
  let result = interactions
  if (contact) result = result.filter(i => i.linked_contact === contact)
  if (opportunity) result = result.filter(i => i.linked_opportunity === opportunity)
  res.json(result.sort((a, b) => new Date(b.date) - new Date(a.date)))
})

router.post('/', (req, res) => {
  const interactions = read('interactions')
  const newInteraction = {
    id: uuid(),
    type: 'email',
    date: new Date().toISOString(),
    summary: '',
    linked_contact: null,
    linked_opportunity: null,
    ...req.body,
  }
  interactions.push(newInteraction)
  write('interactions', interactions)

  // Update contact last_touched
  if (newInteraction.linked_contact) {
    const contacts = read('contacts')
    const idx = contacts.findIndex(c => c.id === newInteraction.linked_contact)
    if (idx !== -1) {
      contacts[idx].last_touched = newInteraction.date
      write('contacts', contacts)
    }
  }

  // Update opportunity last_activity
  if (newInteraction.linked_opportunity) {
    const opps = read('opportunities')
    const idx = opps.findIndex(o => o.id === newInteraction.linked_opportunity)
    if (idx !== -1) {
      opps[idx].last_activity = newInteraction.date
      write('opportunities', opps)
    }
  }

  res.status(201).json(newInteraction)
})

router.put('/:id', (req, res) => {
  const interactions = read('interactions')
  const idx = interactions.findIndex(i => i.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  interactions[idx] = { ...interactions[idx], ...req.body, id: req.params.id }
  write('interactions', interactions)
  res.json(interactions[idx])
})

router.delete('/:id', (req, res) => {
  const interactions = read('interactions')
  write('interactions', interactions.filter(i => i.id !== req.params.id))
  res.json({ ok: true })
})

export default router
