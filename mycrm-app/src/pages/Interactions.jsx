import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { formatDate, formatRelative } from '../utils'
import Modal from '../components/Modal'

const ICONS = { email: '✉', meeting: '☕', DM: '💬', call: '📞' }
const EMPTY = { type: 'email', summary: '', date: new Date().toISOString().slice(0, 10), linked_contact: null, linked_opportunity: null }

function LogForm({ initial = EMPTY, contacts, opportunities, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Type</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none"
            value={form.type} onChange={e => set('type', e.target.value)}>
            {['email', 'meeting', 'DM', 'call'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Date</label>
          <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
            value={form.date} onChange={e => set('date', e.target.value)} />
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
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Summary</label>
        <textarea
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none"
          rows={3} placeholder="What happened? Key takeaways?" autoFocus
          value={form.summary} onChange={e => set('summary', e.target.value)}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} className="flex-1 bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg py-2 hover:bg-white">Save</button>
        <button onClick={onCancel} className="flex-1 bg-zinc-800 text-zinc-300 text-sm font-semibold rounded-lg py-2 hover:bg-zinc-700">Cancel</button>
      </div>
    </div>
  )
}

export default function Interactions() {
  const [interactions, setInteractions] = useState([])
  const [contacts, setContacts] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [creating, setCreating] = useState(false)
  const [filterContact, setFilterContact] = useState('')

  useEffect(() => {
    api.interactions.list().then(setInteractions)
    api.contacts.list().then(setContacts)
    api.opportunities.list().then(setOpportunities)
  }, [])

  async function saveInteraction(data) {
    const created = await api.interactions.create({
      ...data,
      date: new Date(data.date).toISOString(),
    })
    setInteractions(is => [created, ...is])
    setCreating(false)
  }

  async function deleteInteraction(id) {
    await api.interactions.delete(id)
    setInteractions(is => is.filter(i => i.id !== id))
  }

  const contactMap = Object.fromEntries(contacts.map(c => [c.id, c]))
  const oppMap = Object.fromEntries(opportunities.map(o => [o.id, o]))

  const filtered = filterContact
    ? interactions.filter(i => i.linked_contact === filterContact)
    : interactions

  // Group by date
  const grouped = filtered.reduce((acc, i) => {
    const key = new Date(i.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(i)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Interactions <span className="text-zinc-600 font-normal text-base ml-1">{interactions.length}</span></h1>
        <button
          onClick={() => setCreating(true)}
          className="bg-zinc-100 text-zinc-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white"
        >
          + Log Interaction
        </button>
      </div>

      <div className="mb-4">
        <select
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none"
          value={filterContact}
          onChange={e => setFilterContact(e.target.value)}
        >
          <option value="">All contacts</option>
          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="text-xs text-zinc-600 font-medium mb-2 uppercase tracking-wider">{date}</div>
            <div className="space-y-2">
              {items.map(i => {
                const contact = i.linked_contact ? contactMap[i.linked_contact] : null
                const opp = i.linked_opportunity ? oppMap[i.linked_opportunity] : null
                return (
                  <div key={i.id} className="flex gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 group hover:border-zinc-700 transition-colors">
                    <div className="text-xl mt-0.5 w-6 text-center shrink-0">{ICONS[i.type] || '·'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-300 capitalize">{i.type}</span>
                        {contact && <span className="text-xs text-blue-400">{contact.name}</span>}
                        {opp && <span className="text-xs text-zinc-500 truncate max-w-[200px]">{opp.title}</span>}
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed">{i.summary}</p>
                    </div>
                    <button
                      onClick={() => { if (confirm('Delete this interaction?')) deleteInteraction(i.id) }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-500/60 hover:text-red-400 shrink-0 px-1.5 py-0.5 rounded bg-zinc-800 h-fit mt-0.5"
                    >
                      Del
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-zinc-600 text-sm py-12">No interactions logged yet.</div>
        )}
      </div>

      {creating && (
        <Modal title="Log Interaction" onClose={() => setCreating(false)}>
          <LogForm
            contacts={contacts}
            opportunities={opportunities}
            onSave={saveInteraction}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}
    </div>
  )
}
