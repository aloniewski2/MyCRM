import { useEffect, useState, useRef } from 'react'
import { api } from '../api/client'

const SEVERITY_COLOR = {
  high: 'text-red-400',
  medium: 'text-orange-400',
  low: 'text-amber-400',
}
const TYPE_ICON = {
  overdue_task: '⏰',
  at_risk: '⚠',
  stalling_deal: '◧',
  warm_ping: '◎',
}

export default function NotificationBell({ navigate }) {
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function load() {
    try {
      const d = await api.notifications.get()
      setData(d)

      // Browser notification on first load if permitted
      if (d.counts.high > 0 && Notification.permission === 'granted') {
        new Notification('MyCRM — Action needed', {
          body: `${d.counts.high} urgent item${d.counts.high > 1 ? 's' : ''} need your attention.`,
          silent: true,
        })
      }
    } catch {}
  }

  function handleClick(notif) {
    setOpen(false)
    if (notif.type === 'overdue_task') navigate('tasks')
    else if (notif.linked_contact) navigate('contacts', notif.linked_contact)
    else if (notif.linked_opportunity) navigate('pipeline', notif.linked_opportunity)
  }

  const total = data?.counts.total ?? 0
  const urgent = data?.counts.high ?? 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-sm transition-colors ${
          open ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
        }`}
      >
        <span className="text-base leading-none relative">
          🔔
          {urgent > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
              {urgent > 9 ? '9+' : urgent}
            </span>
          )}
        </span>
        <span className="hidden md:block font-medium">
          Notifications
          {total > 0 && <span className="text-zinc-500 ml-1 font-normal">({total})</span>}
        </span>
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 w-80 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Notifications
            </span>
            {total === 0 && <span className="text-xs text-zinc-600">All clear</span>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {total === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-zinc-600">
                Nothing needs attention right now.
              </div>
            ) : (
              data.notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full text-left px-4 py-3 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/60 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-sm mt-0.5 shrink-0">{TYPE_ICON[n.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium leading-snug ${SEVERITY_COLOR[n.severity]}`}>
                        {n.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{n.detail}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-zinc-800 flex items-center justify-between">
            <button
              onClick={async () => {
                if (Notification.permission === 'default') await Notification.requestPermission()
                load()
              }}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {Notification.permission === 'granted' ? '🔔 Browser alerts on' : 'Enable browser alerts'}
            </button>
            <button onClick={() => { load(); }} className="text-[11px] text-zinc-600 hover:text-zinc-400">
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
