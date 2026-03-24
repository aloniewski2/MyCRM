import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import Pipeline from './pages/Pipeline'
import Tasks from './pages/Tasks'
import Interactions from './pages/Interactions'
import Settings from './pages/Settings'
import Calendar from './pages/Calendar'
import NotificationBell from './components/NotificationBell'

const NAV = [
  { id: 'dashboard', label: 'Today', short: 'T' },
  { id: 'contacts', label: 'Contacts', short: 'C' },
  { id: 'pipeline', label: 'Pipeline', short: 'P' },
  { id: 'tasks', label: 'Tasks', short: 'Tk' },
  { id: 'interactions', label: 'Activity', short: 'A' },
  { id: 'calendar', label: 'Calendar', short: 'Ca' },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [pageParam, setPageParam] = useState(null)

  function navigate(target, param = null) {
    setPage(target)
    setPageParam(param)
  }

  function renderPage() {
    switch (page) {
      case 'dashboard': return <Dashboard navigate={navigate} />
      case 'contacts': return <Contacts initialContactId={pageParam} navigate={navigate} />
      case 'pipeline': return <Pipeline initialOppId={pageParam} navigate={navigate} />
      case 'tasks': return <Tasks />
      case 'interactions': return <Interactions />
      case 'calendar': return <Calendar navigate={navigate} />
      case 'settings': return <Settings />
      default: return <Dashboard navigate={navigate} />
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <nav className="w-14 md:w-48 shrink-0 border-r border-zinc-800/50 flex flex-col py-5 px-2 md:px-3 sticky top-0 h-screen">
        <div className="mb-6 px-2">
          <div className="text-xs font-bold text-zinc-100 tracking-widest uppercase hidden md:block">MyCRM</div>
          <div className="text-base font-bold text-zinc-100 md:hidden text-center">M</div>
        </div>

        <div className="space-y-0.5 flex-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => { setPage(item.id); setPageParam(null) }}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                page === item.id
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <span className="text-xs font-bold w-5 text-center shrink-0 md:hidden">{item.short}</span>
              <span className="hidden md:block">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="border-t border-zinc-800/50 pt-2 space-y-0.5">
          <NotificationBell navigate={navigate} />
          <button
            onClick={() => { setPage('settings'); setPageParam(null) }}
            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
              page === 'settings'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
            }`}
          >
            <span className="text-xs font-bold w-5 text-center shrink-0 md:hidden">S</span>
            <span className="hidden md:block">Settings</span>
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
