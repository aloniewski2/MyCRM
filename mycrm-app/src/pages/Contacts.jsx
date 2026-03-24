import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { formatRelative, formatDate, warmthBadge, formatCurrency, TAGS } from '../utils'
import WarmthDot from '../components/WarmthDot'
import Modal from '../components/Modal'

const EMPTY_CONTACT = {
  name: '', role: '', company: '', source: '', email: '', linkedin_url: '', notes: '', tags: [],
}

function ContactForm({ initial = EMPTY_CONTACT, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_CONTACT, ...initial })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function toggleTag(tag) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  return (
    <div className="space-y-3">
      {[['Name', 'name'], ['Role', 'role'], ['Company', 'company'], ['Source', 'source'], ['Email', 'email'], ['LinkedIn URL', 'linkedin_url']].map(([label, key]) => (
        <div key={key}>
          <label className="block text-xs text-zinc-400 mb-1">{label}</label>
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            value={form[key]}
            onChange={e => set(key, e.target.value)}
            placeholder={label}
          />
        </div>
      ))}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Tags</label>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                form.tags.includes(tag)
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Notes</label>
        <textarea
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 resize-none"
          rows={3}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Quick context about this person..."
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          className="flex-1 bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg py-2 hover:bg-white transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-zinc-800 text-zinc-300 text-sm font-semibold rounded-lg py-2 hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function ContactCard({ contact, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-600 transition-colors group"
    >
      <WarmthDot warmth={contact.warmth} atRisk={contact.at_risk} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-100 group-hover:text-white truncate">{contact.name}</div>
        <div className="text-xs text-zinc-500 truncate">{contact.role}{contact.company ? ` · ${contact.company}` : ''}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-zinc-600">{contact.last_touched ? formatRelative(contact.last_touched) : 'never'}</div>
        {contact.open_opportunity && (
          <div className="text-[10px] text-blue-400 truncate max-w-[100px]">{contact.open_opportunity.stage}</div>
        )}
      </div>
    </div>
  )
}

function ContactDetail({ contact, onClose, onUpdate, onDelete }) {
  const [interactions, setInteractions] = useState([])
  const [notes, setNotes] = useState([])
  const [editing, setEditing] = useState(false)
  const [addingInteraction, setAddingInteraction] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [intForm, setIntForm] = useState({ type: 'email', summary: '', date: new Date().toISOString().slice(0, 10) })
  const [draft, setDraft] = useState(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState(null)
  const [draftSource, setDraftSource] = useState(null)
  const [emailData, setEmailData] = useState(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailThreads, setEmailThreads] = useState(null)
  const [meetingData, setMeetingData] = useState(null)

  useEffect(() => {
    api.interactions.list({ contact: contact.id }).then(all => {
      setInteractions(all)
      const meetings = all.filter(i => i.type === 'meeting').slice(0, 3)
      setMeetingData(meetings)
    })
    api.notes.list({ contact: contact.id }).then(setNotes)
  }, [contact.id])

  async function generateDraft() {
    setDraftLoading(true)
    setDraftError(null)
    setDraft(null)
    setDraftSource(null)
    try {
      const res = await api.draft.generate(contact.id)
      setDraft(res.draft)
      setDraftSource(res.source)
    } catch (err) {
      const raw = err.message
      const msg = raw.startsWith('{') ? (() => { try { return JSON.parse(raw).error } catch { return raw } })() : raw
      setDraftError(msg)
    }
    setDraftLoading(false)
  }

  async function loadEmail() {
    setEmailLoading(true)
    try {
      const data = await api.email.getForContact(contact.id)
      setEmailData(data)
      if (data.found) {
        const threads = await api.email.getThreads(contact.id)
        setEmailThreads(threads)
      }
    } catch (err) {
      const raw = err.message
      const msg = raw.startsWith('{') ? (() => { try { return JSON.parse(raw).error } catch { return raw } })() : raw
      setEmailData({ error: msg })
    }
    setEmailLoading(false)
  }

  async function saveInteraction() {
    await api.interactions.create({
      ...intForm,
      date: new Date(intForm.date).toISOString(),
      linked_contact: contact.id,
    })
    const updated = await api.contacts.get(contact.id)
    onUpdate(updated)
    api.interactions.list({ contact: contact.id }).then(setInteractions)
    setAddingInteraction(false)
    setIntForm({ type: 'email', summary: '', date: new Date().toISOString().slice(0, 10) })
  }

  async function saveNote() {
    await api.notes.create({ body: newNote, linked_contact: contact.id })
    api.notes.list({ contact: contact.id }).then(setNotes)
    setAddingNote(false)
    setNewNote('')
  }

  const ICON = { email: '✉', meeting: '☕', DM: '💬', call: '📞' }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl bg-zinc-950 border-l border-zinc-800 overflow-y-auto">
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">{contact.name}</h2>
            <div className="text-xs text-zinc-500">{contact.role} · {contact.company}</div>
          </div>
          <div className="flex items-center gap-2">
            <WarmthDot warmth={contact.warmth} atRisk={contact.at_risk} size="md" />
            <button
              onClick={generateDraft}
              disabled={draftLoading}
              className="text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
            >
              {draftLoading ? '...' : '✦ Draft'}
            </button>
            <button onClick={() => setEditing(true)} className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 px-2.5 py-1 rounded-lg">Edit</button>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">×</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary row */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <div className="text-zinc-500 mb-0.5">Last contact</div>
              <div className="text-zinc-200 font-medium">{contact.last_touched ? formatRelative(contact.last_touched) : 'Never'}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <div className="text-zinc-500 mb-0.5">Source</div>
              <div className="text-zinc-200 font-medium">{contact.source || '—'}</div>
            </div>
            {contact.email && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <div className="text-zinc-500 mb-0.5">Email</div>
                <a href={`mailto:${contact.email}`} className="text-zinc-200 hover:text-blue-400 truncate block font-medium text-xs">{contact.email}</a>
              </div>
            )}
            {contact.linkedin_url && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <div className="text-zinc-500 mb-0.5">LinkedIn</div>
                <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate block">
                  View profile
                </a>
              </div>
            )}
          </div>

          {/* Open opportunity */}
          {contact.open_opportunity && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-1">
              <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Open Deal</div>
              <div className="text-sm text-zinc-100 font-medium">{contact.open_opportunity.title}</div>
              <div className="text-xs text-zinc-400">
                {formatCurrency(contact.open_opportunity.estimated_value)} · {contact.open_opportunity.stage}
                {contact.open_opportunity.deadline ? ` · Due ${formatDate(contact.open_opportunity.deadline)}` : ''}
              </div>
              {contact.open_opportunity.next_action && (
                <div className="text-xs text-zinc-300 mt-1">→ {contact.open_opportunity.next_action}</div>
              )}
            </div>
          )}

          {/* AI Draft */}
          {(draft || draftError) && (
            <div className={`border rounded-xl p-4 space-y-2 ${draftError ? 'bg-red-500/5 border-red-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider">✦ AI Follow-up Draft</div>
                {draft && (
                  <button
                    onClick={() => navigator.clipboard.writeText(draft)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded"
                  >
                    Copy
                  </button>
                )}
              </div>
              {draftError && <p className="text-xs text-red-400">{draftError}</p>}
              {draft && <p className="text-sm text-zinc-200 leading-relaxed">{draft}</p>}
            </div>
          )}

          {/* Email via IMAP */}
          {contact.email && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">✉ Email</div>
                {!emailData && (
                  <button onClick={loadEmail} disabled={emailLoading} className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 px-2.5 py-1 rounded-lg disabled:opacity-40">
                    {emailLoading ? 'Loading...' : 'Load'}
                  </button>
                )}
              </div>
              {emailData && (
                emailData.error ? (
                  <p className="text-xs text-red-400">{emailData.error}</p>
                ) : !emailData.found ? (
                  <p className="text-xs text-zinc-500">No emails found with {contact.email}.</p>
                ) : (
                  <div className="space-y-2">
                    {emailData.no_reply_alert && (
                      <div className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-1">
                        ⚠ No reply in {emailData.no_reply_days}d — follow up
                      </div>
                    )}
                    <div className="text-xs text-zinc-300 font-medium truncate">{emailData.subject}</div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${emailData.direction === 'sent' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700 text-zinc-400'}`}>
                        {emailData.direction === 'sent' ? 'SENT' : 'RECEIVED'}
                      </span>
                      <span>{emailData.days_since === 0 ? 'today' : `${emailData.days_since}d ago`}</span>
                      <span>· {emailData.total} thread{emailData.total !== 1 ? 's' : ''}</span>
                    </div>
                    {emailThreads?.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-zinc-800">
                        {emailThreads.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.direction === 'received' ? 'bg-blue-400' : 'bg-zinc-600'}`} />
                            <span className="text-zinc-400 truncate flex-1">{t.subject}</span>
                            <span className="text-zinc-600 shrink-0">{t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* Meetings from interactions */}
          {meetingData?.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">📅 Meetings</div>
              {meetingData.map(m => {
                const isPast = new Date(m.date) < new Date()
                return (
                  <div key={m.id} className="flex items-start gap-3 py-1.5 border-b border-zinc-800/60 last:border-0">
                    <div className="text-center shrink-0 w-7">
                      <div className="text-[10px] text-zinc-600">{new Date(m.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                      <div className="text-sm font-bold text-zinc-300 leading-none">{new Date(m.date).getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-zinc-300 leading-snug">{m.summary}</div>
                      {!isPast && <span className="text-[10px] text-blue-400 font-semibold">UPCOMING</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Context</div>
              <p className="text-sm text-zinc-300 leading-relaxed">{contact.notes}</p>
            </div>
          )}

          {/* Interaction log */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Interactions</h3>
              <button
                onClick={() => setAddingInteraction(!addingInteraction)}
                className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 px-2.5 py-1 rounded-lg"
              >
                + Log
              </button>
            </div>

            {addingInteraction && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Type</label>
                    <select
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                      value={intForm.type}
                      onChange={e => setIntForm(f => ({ ...f, type: e.target.value }))}
                    >
                      {['email', 'meeting', 'DM', 'call'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Date</label>
                    <input
                      type="date"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-100 focus:outline-none"
                      value={intForm.date}
                      onChange={e => setIntForm(f => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Summary</label>
                  <textarea
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none"
                    rows={2}
                    placeholder="What happened?"
                    value={intForm.summary}
                    onChange={e => setIntForm(f => ({ ...f, summary: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveInteraction} className="flex-1 bg-zinc-100 text-zinc-900 text-xs font-semibold rounded-lg py-1.5 hover:bg-white">Save</button>
                  <button onClick={() => setAddingInteraction(false)} className="flex-1 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg py-1.5">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {interactions.length === 0 && <p className="text-xs text-zinc-600">No interactions logged.</p>}
              {interactions.map(i => (
                <div key={i.id} className="flex gap-3 py-2 border-b border-zinc-800/60 last:border-0">
                  <div className="text-base mt-0.5 w-5 text-center shrink-0">{ICON[i.type] || '·'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-zinc-400 capitalize">{i.type}</span>
                      <span className="text-xs text-zinc-600">{formatDate(i.date)}</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{i.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Notes</h3>
              <button
                onClick={() => setAddingNote(!addingNote)}
                className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 px-2.5 py-1 rounded-lg"
              >
                + Add
              </button>
            </div>
            {addingNote && (
              <div className="mb-3 space-y-2">
                <textarea
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none resize-none"
                  rows={2}
                  placeholder="Note..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={saveNote} className="flex-1 bg-zinc-100 text-zinc-900 text-xs font-semibold rounded-lg py-1.5 hover:bg-white">Save</button>
                  <button onClick={() => setAddingNote(false)} className="flex-1 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg py-1.5">Cancel</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {notes.map(n => (
                <div key={n.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-zinc-300 leading-relaxed">{n.body}</p>
                  <div className="text-[10px] text-zinc-600 mt-1">{formatDate(n.date)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Delete */}
          <div className="pt-2 border-t border-zinc-800">
            <button
              onClick={() => { if (confirm(`Delete ${contact.name}?`)) { onDelete(contact.id); onClose() } }}
              className="text-xs text-red-500/70 hover:text-red-400 transition-colors"
            >
              Delete contact
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <Modal title={`Edit ${contact.name}`} onClose={() => setEditing(false)}>
          <ContactForm
            initial={contact}
            onSave={async data => {
              const updated = await api.contacts.update(contact.id, data)
              onUpdate(updated)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}
    </div>
  )
}

export default function Contacts({ initialContactId }) {
  const [contacts, setContacts] = useState([])
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.contacts.list().then(data => {
      setContacts(data)
      if (initialContactId) {
        const c = data.find(x => x.id === initialContactId)
        if (c) setSelected(c)
      }
    })
  }, [initialContactId])

  function updateContact(updated) {
    setContacts(cs => cs.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
  }

  function deleteContact(id) {
    api.contacts.delete(id)
    setContacts(cs => cs.filter(c => c.id !== id))
  }

  const filtered = contacts.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.warmth === filter || (filter === 'at-risk' && c.at_risk)
    return matchSearch && matchFilter
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Contacts <span className="text-zinc-600 font-normal text-base ml-1">{contacts.length}</span></h1>
        <button
          onClick={() => setCreating(true)}
          className="bg-zinc-100 text-zinc-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white transition-colors"
        >
          + Add Contact
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
          placeholder="Search by name or company..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {['all', 'hot', 'warm', 'cold', 'at-risk'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors capitalize ${
                filter === f ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {filtered.map(c => (
          <ContactCard key={c.id} contact={c} onClick={() => setSelected(c)} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-zinc-600 text-sm py-12">No contacts match.</div>
        )}
      </div>

      {selected && (
        <ContactDetail
          contact={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateContact}
          onDelete={deleteContact}
        />
      )}

      {creating && (
        <Modal title="New Contact" onClose={() => setCreating(false)}>
          <ContactForm
            onSave={async data => {
              const created = await api.contacts.create(data)
              setContacts(cs => [...cs, created])
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}
    </div>
  )
}
