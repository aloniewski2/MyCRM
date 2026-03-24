import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { read, write } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const notes = read('notes')
  const { contact } = req.query
  let result = notes
  if (contact) result = result.filter(n => n.linked_contact === contact)
  res.json(result.sort((a, b) => new Date(b.date) - new Date(a.date)))
})

router.post('/', (req, res) => {
  const notes = read('notes')
  const newNote = {
    id: uuid(),
    body: '',
    date: new Date().toISOString(),
    linked_contact: null,
    ...req.body,
  }
  notes.push(newNote)
  write('notes', notes)
  res.status(201).json(newNote)
})

router.put('/:id', (req, res) => {
  const notes = read('notes')
  const idx = notes.findIndex(n => n.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  notes[idx] = { ...notes[idx], ...req.body, id: req.params.id }
  write('notes', notes)
  res.json(notes[idx])
})

router.delete('/:id', (req, res) => {
  const notes = read('notes')
  write('notes', notes.filter(n => n.id !== req.params.id))
  res.json({ ok: true })
})

export default router
