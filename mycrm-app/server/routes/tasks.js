import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { read, write } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const tasks = read('tasks')
  const { status, contact } = req.query
  let result = tasks
  if (status) result = result.filter(t => t.status === status)
  if (contact) result = result.filter(t => t.linked_contact === contact)
  res.json(result.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)))
})

router.post('/', (req, res) => {
  const tasks = read('tasks')
  const newTask = {
    id: uuid(),
    title: '',
    due_date: null,
    priority: 'medium',
    linked_contact: null,
    linked_opportunity: null,
    status: 'open',
    created_at: new Date().toISOString(),
    ...req.body,
  }
  tasks.push(newTask)
  write('tasks', tasks)
  res.status(201).json(newTask)
})

router.put('/:id', (req, res) => {
  const tasks = read('tasks')
  const idx = tasks.findIndex(t => t.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  tasks[idx] = { ...tasks[idx], ...req.body, id: req.params.id }
  write('tasks', tasks)
  res.json(tasks[idx])
})

router.delete('/:id', (req, res) => {
  const tasks = read('tasks')
  write('tasks', tasks.filter(t => t.id !== req.params.id))
  res.json({ ok: true })
})

export default router
