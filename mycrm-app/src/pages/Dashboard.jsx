import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { formatRelative, formatCurrency, formatDate, priorityBadge, stageBadge } from '../utils'
import WarmthDot from '../components/WarmthDot'

export default function Dashboard({ navigate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.briefing.get().then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Loading...</div>
  )

  const { overdue, to_ping, deals_this_week, summary } = data
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-xs text-zinc-600 mb-1">{today}</div>
        <h1 className="text-xl font-semibold text-zinc-100">Today</h1>
        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
          <span>{summary.hot} hot</span>
          <span>{summary.warm} warm</span>
          <span>{summary.open_opportunities} open deals</span>
          {summary.at_risk > 0 && <span className="text-orange-400">{summary.at_risk} at risk</span>}
          {summary.overdue_tasks > 0 && <span className="text-red-400">{summary.overdue_tasks} overdue</span>}
        </div>
      </div>

      <div className="space-y-6">
        {/* Overdue tasks */}
        {overdue.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <h2 className="text-xs font-semibold text-zinc-400">Overdue</h2>
            </div>
            <div className="space-y-1">
              {overdue.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-zinc-900 transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-200">{t.title}</span>
                    <span className="text-xs text-red-400 ml-2">Due {formatDate(t.due_date)}</span>
                  </div>
                  <span className={`text-[10px] font-semibold ${priorityBadge(t.priority)}`}>{t.priority}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contacts to ping */}
        {to_ping.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <h2 className="text-xs font-semibold text-zinc-400">Reach out</h2>
            </div>
            <div className="space-y-1">
              {to_ping.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate('contacts', c.id)}
                  className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-zinc-900 transition-colors text-left"
                >
                  <WarmthDot warmth={c.warmth} atRisk={c.at_risk} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-200">{c.name}</span>
                    <span className="text-xs text-zinc-500 ml-2">{c.company}</span>
                    {c.at_risk && <span className="text-xs text-orange-400 ml-2">at risk</span>}
                  </div>
                  <span className="text-xs text-zinc-600 shrink-0">
                    {c.last_touched ? formatRelative(c.last_touched) : 'never'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Deals */}
        {deals_this_week.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              <h2 className="text-xs font-semibold text-zinc-400">Deals this week</h2>
            </div>
            <div className="space-y-1">
              {deals_this_week.map(o => {
                const { label: stageLabel, cls } = stageBadge(o.stage)
                return (
                  <button
                    key={o.id}
                    onClick={() => navigate('pipeline', o.id)}
                    className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-zinc-900 transition-colors text-left"
                  >
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${cls}`}>{stageLabel}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-zinc-200">{o.title}</span>
                      {o.stalling && <span className="text-xs text-orange-400 ml-2">stalling</span>}
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">{formatCurrency(o.estimated_value)}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {overdue.length === 0 && to_ping.length === 0 && deals_this_week.length === 0 && (
          <p className="text-sm text-zinc-600">Nothing needs attention today.</p>
        )}
      </div>
    </div>
  )
}
