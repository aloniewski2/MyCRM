import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { read, write } from '../db.js'
import { enrichOpportunity } from '../warmth.js'

const router = Router()

router.get('/', (req, res) => {
  const opps = read('opportunities')
  const interactions = read('interactions')
  const contacts = read('contacts')
  res.json(opps.map(o => enrichOpportunity(o, interactions, contacts)))
})

router.get('/:id', (req, res) => {
  const opps = read('opportunities')
  const opp = opps.find(o => o.id === req.params.id)
  if (!opp) return res.status(404).json({ error: 'Not found' })
  const interactions = read('interactions')
  const contacts = read('contacts')
  res.json(enrichOpportunity(opp, interactions, contacts))
})

router.post('/', (req, res) => {
  const opps = read('opportunities')
  const newOpp = {
    id: uuid(),
    title: '',
    type: '',
    estimated_value: 0,
    stage: 'prospect',
    linked_contact: null,
    next_action: '',
    deadline: null,
    last_activity: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...req.body,
  }
  opps.push(newOpp)
  write('opportunities', opps)
  res.status(201).json(newOpp)
})

router.put('/:id', (req, res) => {
  const opps = read('opportunities')
  const idx = opps.findIndex(o => o.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  opps[idx] = { ...opps[idx], ...req.body, id: req.params.id }
  write('opportunities', opps)
  const interactions = read('interactions')
  const contacts = read('contacts')
  res.json(enrichOpportunity(opps[idx], interactions, contacts))
})

router.delete('/:id', (req, res) => {
  const opps = read('opportunities')
  write('opportunities', opps.filter(o => o.id !== req.params.id))
  res.json({ ok: true })
})

export default router
