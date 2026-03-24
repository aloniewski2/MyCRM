import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { formatDate, formatRelative } from '../utils'
import Modal from '../components/Modal'

function groupMeetings(meetings) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfNextWeek = new Date(startOfToday.getTime() + 7 * 86400000)
  const startOfLater = new Date(startOfToday.getTime() + 14 * 86400000)

  const upcoming = meetings.filter(m => new Date(m.date) >= startOfToday)
  const past = meetings.filter(m => new Date(m.date) < startOfToday).reverse()

  const groups = []
  const today = upcoming.filter(m => new Date(m.date) < new Date(startOfToday.getTime() + 86400000))
  const thisWeek = upcoming.filter(m => new Date(m.date) >= new Date(startOfToday.getTime() + 86400000) && new Date(m.date) < startOfNextWeek)
  const nextWeek = upcoming.filter(m => new Date(m.date) >= startOfNextWeek && new Date(m.date) < startOfLater)
  const later = upcoming.filter(m => new Date(m.date) >= startOfLater)

  if (today.length) groups.push({ label: 'Today', meetings: today, upcoming: true })
  if (thisWeek.length) groups.push({ label: 'This Week', meetings: thisWeek, upcoming: true })
  if (nextWeek.length) groups.push({ label: 'Next Week', meetings: nextWeek, upcoming: true })
  if (later.length) groups.push({ label: 'Later', meetings: later, upcoming: true })
  if (past.length) groups.push({ label: 'Past', meetings: past.slice(0, 20), upcoming: false })

  return groups
}

function MeetingCard({ meeting, contact, opportunity, navigate }) {
  const isPast = new Date(meeting.date) < new Date()
  return (
    <div className={`flex gap-4 bg-zinc-900 border rounded-xl px-4 py-3 ${isPast ? 'border-zinc-800/40 opacity-70' : 'border-zinc-700/60'}`}>
      <div className="shrink-0 text-center w-10">
        <div className="text-xs text-zinc-600 uppercase">{new Date(meeting.date).toLocaleDateString('en-US', { month: 'short' })}</div>
        <div className="text-lg font-bold text-zinc-200 leading-none">{new Date(meeting.date).getDate()}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-zinc-100">
            {meeting.summary || 'Meeting'}
          </span>
          {!isPast && (
            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-semibold">UPCOMING</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {contact && (
            <button
              onClick={() => navigate('contacts', contact.id)}
              className="text-xs text-blue-400 hover:underline"
            >
              {contact.name} · {contact.company}
            </button>
          )}
          {opportunity && (
            <span className="text-xs text-zinc-500 truncate">{opportunity.title}</span>
          )}
          <span className="text-xs text-zinc-600">
            {new Date(meeting.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Calendar({ navigate }) {
  const [meetings, setMeetings] = useState([])
  const [contacts, setContacts] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [scheduling, setScheduling] = useState(false)
  const [form, setForm] = useState({ linked_contact: '', linked_opportunity: '', date: '', time: '10:00', summary: '' })

  useEffect(() => {
    load()
    api.contacts.list().then(setContacts)
    api.opportunities.list().then(setOpportunities)
  }, [])

  async function load() {
    const all = await api.interactions.list()
    setMeetings(all.filter(i => i.type === 'meeting').sort((a, b) => new Date(b.date) - new Date(a.date)))
  }

  async function scheduleMeeting() {
    if (!form.date) return
    const datetime = new Date(`${form.date}T${form.time}`).toISOString()
    await api.interactions.create({
      type: 'meeting',
      date: datetime,
      summary: form.summary || 'Meeting',
      linked_contact: form.linked_contact || null,
      linked_opportunity: form.linked_opportunity || null,
    })
    await load()
    setScheduling(false)
    setForm({ linked_contact: '', linked_opportunity: '', date: '', time: '10:00', summary: '' })
  }

  const contactMap = Object.fromEntries(contacts.map(c => [c.id, c]))
  const oppMap = Object.fromEntries(opportunities.map(o => [o.id, o]))
  const groups = groupMeetings(meetings)

  const upcomingCount = meetings.filter(m => new Date(m.date) >= new Date()).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Calendar</h1>
          <div className="text-xs text-zinc-500 mt-0.5">
            {upcomingCount} upcoming · {meetings.length} total meetings logged
          </div>
        </div>
        <button
          onClick={() => setScheduling(true)}
          className="bg-zinc-100 text-zinc-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white"
        >
          + Schedule Meeting
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center text-zinc-600 text-sm py-16">
          No meetings logged yet. Log interactions of type "meeting" or schedule one here.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs font-semibold uppercase tracking-wider ${group.upcoming ? 'text-blue-400' : 'text-zinc-600'}`}>
                  {group.label}
                </span>
                <div className="flex-1 border-t border-zinc-800" />
                <span className="text-xs text-zinc-600">{group.meetings.length}</span>
              </div>
              <div className="space-y-2">
                {group.meetings.map(m => (
                  <MeetingCard
                    key={m.id}
                    meeting={m}
                    contact={m.linked_contact ? contactMap[m.linked_contact] : null}
                    opportunity={m.linked_opportunity ? oppMap[m.linked_opportunity] : null}
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {scheduling && (
        <Modal title="Schedule Meeting" onClose={() => setScheduling(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Date</label>
                <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Time</label>
                <input type="time" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                  value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">What's the meeting about?</label>
              <input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                placeholder="Discovery call, proposal review..." autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Contact</label>
                <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none"
                  value={form.linked_contact} onChange={e => setForm(f => ({ ...f, linked_contact: e.target.value }))}>
                  <option value="">— none —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Deal</label>
                <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none"
                  value={form.linked_opportunity} onChange={e => setForm(f => ({ ...f, linked_opportunity: e.target.value }))}>
                  <option value="">— none —</option>
                  {opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={scheduleMeeting} className="flex-1 bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-lg py-2 hover:bg-white">Save</button>
              <button onClick={() => setScheduling(false)} className="flex-1 bg-zinc-800 text-zinc-300 text-sm font-semibold rounded-lg py-2 hover:bg-zinc-700">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
