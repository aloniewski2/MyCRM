import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { formatDate, priorityBadge, isOverdue } from '../utils'
import Modal from '../components/Modal'

const EMPTY_TASK = { title: '', due_date: '', priority: 'medium', linked_contact: null, linked_opportunity: null }

function TaskForm({ initial = EMPTY_TASK, contacts, opportunities, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_TASK, ...initial })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Task</label>
        <input
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          value={form.title} onChange={e => set('title', e.target.value)} placeholder="What needs to happen?" autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Due Date</label>
          <input type="date"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
            value={form.due_date ? form.due_date.slice(0, 10) : ''} onChange={e => set('due_date', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Priority</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none"
            value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Contact</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none"
            value={form.linked_contact || ''} onChange={e => set('linked_contact', e.target.value || null)}>
            <option value="">— none —</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Deal</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none"
            value={form.linked_opportunity || ''} onChange={e => set('linked_opportunity', e.target.value || null)}>
            <option value="">— none —</option>
            {opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} className="flex-1 bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg py-2 hover:bg-white">Save</button>
        <button onClick={onCancel} className="flex-1 bg-zinc-800 text-zinc-300 text-sm font-semibold rounded-lg py-2 hover:bg-zinc-700">Cancel</button>
      </div>
    </div>
  )
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [contacts, setContacts] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    api.tasks.list().then(setTasks)
    api.contacts.list().then(setContacts)
    api.opportunities.list().then(setOpportunities)
  }, [])

  async function saveTask(data) {
    const payload = { ...data, due_date: data.due_date ? new Date(data.due_date).toISOString() : null }
    if (editing) {
      const updated = await api.tasks.update(editing.id, payload)
      setTasks(ts => ts.map(t => t.id === updated.id ? updated : t))
    } else {
      const created = await api.tasks.create(payload)
      setTasks(ts => [...ts, created])
    }
    setEditing(null)
    setCreating(false)
  }

  async function toggleDone(task) {
    const updated = await api.tasks.update(task.id, { status: task.status === 'done' ? 'open' : 'done' })
    setTasks(ts => ts.map(t => t.id === updated.id ? updated : t))
  }

  async function deleteTask(id) {
    await api.tasks.delete(id)
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  const contactMap = Object.fromEntries(contacts.map(c => [c.id, c]))
  const oppMap = Object.fromEntries(opportunities.map(o => [o.id, o]))

  const filtered = tasks.filter(t => {
    if (filter === 'open') return t.status === 'open'
    if (filter === 'done') return t.status === 'done'
    if (filter === 'overdue') return t.status === 'open' && isOverdue(t.due_date)
    return true
  })

  const overdueCount = tasks.filter(t => t.status === 'open' && isOverdue(t.due_date)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Tasks</h1>
          {overdueCount > 0 && (
            <div className="text-xs text-red-400 mt-0.5">{overdueCount} overdue</div>
          )}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="bg-zinc-100 text-zinc-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white"
        >
          + Add Task
        </button>
      </div>

      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 mb-4 w-fit">
        {[['open', 'Open'], ['overdue', 'Overdue'], ['done', 'Done']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`text-xs px-3 py-1 rounded-md transition-colors ${filter === val ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {label}
            {val === 'overdue' && overdueCount > 0 && (
              <span className="ml-1 bg-red-500/20 text-red-400 rounded px-1">{overdueCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-zinc-600 text-sm py-12">
            {filter === 'done' ? 'No completed tasks.' : 'No tasks here.'}
          </div>
        )}
        {filtered.map(task => {
          const contact = task.linked_contact ? contactMap[task.linked_contact] : null
          const opp = task.linked_opportunity ? oppMap[task.linked_opportunity] : null
          const overdue = task.status === 'open' && isOverdue(task.due_date)

          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 bg-zinc-900 border rounded-xl px-4 py-3 group transition-colors ${
                overdue ? 'border-red-500/20' : 'border-zinc-800 hover:border-zinc-700'
              } ${task.status === 'done' ? 'opacity-50' : ''}`}
            >
              <button
                onClick={() => toggleDone(task)}
                className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                  task.status === 'done'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'border-zinc-600 hover:border-zinc-400'
                }`}
              >
                {task.status === 'done' && <span className="text-[10px]">✓</span>}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <span className={`text-sm font-medium flex-1 ${task.status === 'done' ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                    {task.title}
                  </span>
                  <span className={`text-[10px] font-bold uppercase shrink-0 ${priorityBadge(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {task.due_date && (
                    <span className={`text-xs ${overdue ? 'text-red-400' : 'text-zinc-500'}`}>
                      {overdue ? 'Overdue · ' : ''}{formatDate(task.due_date)}
                    </span>
                  )}
                  {contact && <span className="text-xs text-zinc-500">→ {contact.name}</span>}
                  {opp && <span className="text-xs text-zinc-600 truncate max-w-[200px]">{opp.title}</span>}
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => setEditing(task)} className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-800">Edit</button>
                <button onClick={() => deleteTask(task.id)} className="text-xs text-red-500/60 hover:text-red-400 px-1.5 py-0.5 rounded bg-zinc-800">Del</button>
              </div>
            </div>
          )
        })}
      </div>

      {(creating || editing) && (
        <Modal title={editing ? 'Edit Task' : 'New Task'} onClose={() => { setEditing(null); setCreating(false) }}>
          <TaskForm
            initial={editing || EMPTY_TASK}
            contacts={contacts}
            opportunities={opportunities}
            onSave={saveTask}
            onCancel={() => { setEditing(null); setCreating(false) }}
          />
        </Modal>
      )}
    </div>
  )
}
