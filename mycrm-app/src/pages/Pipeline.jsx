import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { stageBadge, formatCurrency, formatRelative, formatDate, STAGES } from '../utils'
import Modal from '../components/Modal'

const ACTIVE_STAGES = ['prospect', 'in conversation', 'proposal sent']

const EMPTY_OPP = {
  title: '', type: '', estimated_value: '', stage: 'prospect',
  linked_contact: null, next_action: '', deadline: '',
}

function OppForm({ initial = EMPTY_OPP, contacts, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_OPP, ...initial })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Deal Title</label>
        <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Brand Strategy — Apex Media" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Type</label>
          <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
            value={form.type} onChange={e => set('type', e.target.value)} placeholder="retainer / project" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Value ($)</label>
          <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
            value={form.estimated_value} onChange={e => set('estimated_value', e.target.value)} placeholder="5000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Stage</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none"
            value={form.stage} onChange={e => set('stage', e.target.value)}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Contact</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none"
            value={form.linked_contact || ''} onChange={e => set('linked_contact', e.target.value || null)}>
            <option value="">— none —</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Next Action</label>
        <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
          value={form.next_action} onChange={e => set('next_action', e.target.value)} placeholder="What needs to happen next?" />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Deadline</label>
        <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
          value={form.deadline ? form.deadline.slice(0, 10) : ''} onChange={e => set('deadline', e.target.value)} />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(form)} className="flex-1 bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg py-2 hover:bg-white transition-colors">Save</button>
        <button onClick={onCancel} className="flex-1 bg-zinc-800 text-zinc-300 text-sm font-semibold rounded-lg py-2 hover:bg-zinc-700 transition-colors">Cancel</button>
      </div>
    </div>
  )
}

function OppCard({ opp, onEdit, onMove, onDelete, navigate }) {
  const isActive = ACTIVE_STAGES.includes(opp.stage)

  return (
    <div className={`bg-zinc-900 border rounded-xl p-3 space-y-2 ${opp.stalling && isActive ? 'border-orange-500/30' : 'border-zinc-800'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zinc-100 leading-snug">{opp.title}</div>
          {opp.contact && (
            <button onClick={() => navigate('contacts', opp.contact.id)} className="text-xs text-zinc-500 hover:text-blue-400 transition-colors mt-0.5">
              {opp.contact.name}
            </button>
          )}
        </div>
        <div className="text-sm font-semibold text-zinc-300 shrink-0">{formatCurrency(opp.estimated_value)}</div>
      </div>

      {opp.next_action && (
        <div className="text-xs text-zinc-500 truncate">→ {opp.next_action}</div>
      )}

      <div className="flex items-center gap-1.5 pt-0.5">
        {opp.stalling && isActive && (
          <span className="text-[10px] text-orange-400 font-medium">stalling</span>
        )}
        <div className="flex-1" />
        {ACTIVE_STAGES.includes(opp.stage) && (
          <button
            onClick={() => { const n = STAGES.indexOf(opp.stage) + 1; if (n < STAGES.length) onMove(opp.id, STAGES[n]) }}
            className="text-xs text-zinc-500 hover:text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded"
          >
            Advance →
          </button>
        )}
        <button onClick={() => onEdit(opp)} className="text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">Edit</button>
        <button onClick={() => { if (confirm('Delete this deal?')) onDelete(opp.id) }} className="text-xs text-red-500/60 hover:text-red-400 bg-zinc-800 px-2 py-0.5 rounded">Del</button>
      </div>
    </div>
  )
}

export default function Pipeline({ initialOppId, navigate }) {
  const [opps, setOpps] = useState([])
  const [contacts, setContacts] = useState([])
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState('active') // active | all

  useEffect(() => {
    api.opportunities.list().then(data => {
      setOpps(data)
    })
    api.contacts.list().then(setContacts)
  }, [])

  async function saveOpp(data) {
    const payload = { ...data, estimated_value: Number(data.estimated_value) || 0 }
    if (editing) {
      const updated = await api.opportunities.update(editing.id, payload)
      setOpps(os => os.map(o => o.id === updated.id ? updated : o))
    } else {
      const created = await api.opportunities.create(payload)
      setOpps(os => [...os, created])
    }
    setEditing(null)
    setCreating(false)
  }

  async function moveStage(id, newStage) {
    const updated = await api.opportunities.update(id, { stage: newStage })
    setOpps(os => os.map(o => o.id === updated.id ? updated : o))
  }

  async function deleteOpp(id) {
    await api.opportunities.delete(id)
    setOpps(os => os.filter(o => o.id !== id))
  }

  const displayStages = view === 'active' ? ACTIVE_STAGES : STAGES
  const totalValue = opps
    .filter(o => ACTIVE_STAGES.includes(o.stage))
    .reduce((sum, o) => sum + Number(o.estimated_value), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Pipeline</h1>
          <div className="text-xs text-zinc-500 mt-0.5">
            {opps.filter(o => ACTIVE_STAGES.includes(o.stage)).length} open deals · {formatCurrency(totalValue)} total value
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
            <button onClick={() => setView('active')} className={`text-xs px-2.5 py-1 rounded-md ${view === 'active' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500'}`}>Active</button>
            <button onClick={() => setView('all')} className={`text-xs px-2.5 py-1 rounded-md ${view === 'all' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500'}`}>All</button>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="bg-zinc-100 text-zinc-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white transition-colors"
          >
            + New Deal
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {displayStages.map(stage => {
          const { label, cls } = stageBadge(stage)
          const stageOpps = opps.filter(o => o.stage === stage)
          const stageValue = stageOpps.reduce((s, o) => s + Number(o.estimated_value), 0)

          return (
            <div key={stage}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${cls}`}>{label}</span>
                <span className="text-xs text-zinc-600">{stageOpps.length} · {formatCurrency(stageValue)}</span>
              </div>
              <div className="space-y-3">
                {stageOpps.length === 0 && (
                  <div className="border border-dashed border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-700">Empty</div>
                )}
                {stageOpps.map(o => (
                  <OppCard
                    key={o.id}
                    opp={o}
                    onEdit={setEditing}
                    onMove={moveStage}
                    onDelete={deleteOpp}
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {(creating || editing) && (
        <Modal title={editing ? 'Edit Deal' : 'New Deal'} onClose={() => { setEditing(null); setCreating(false) }}>
          <OppForm
            initial={editing || EMPTY_OPP}
            contacts={contacts}
            onSave={saveOpp}
            onCancel={() => { setEditing(null); setCreating(false) }}
          />
        </Modal>
      )}
    </div>
  )
}
