import { useEffect, useState } from 'react'
import { api } from '../api/client'

function StatusBadge({ connected, label }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
      connected
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        : 'bg-zinc-700/40 text-zinc-500 border-zinc-700/40'
    }`}>
      {connected ? 'CONNECTED' : label || 'NOT CONFIGURED'}
    </span>
  )
}

function Card({ icon, name, description, connected, connectedLabel, children }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{name}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          </div>
        </div>
        <StatusBadge connected={connected} label={connectedLabel} />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, hint }) {
  const [show, setShow] = useState(false)
  const isSecret = type === 'password'
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={isSecret && !show ? 'password' : 'text'}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 pr-14"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {isSecret && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300 px-1">
            {show ? 'hide' : 'show'}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  )
}

function Btn({ onClick, loading, children, variant = 'primary', disabled }) {
  const styles = {
    primary: 'bg-zinc-100 text-zinc-900 hover:bg-white',
    secondary: 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
  }
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${styles[variant]}`}
    >
      {loading ? 'Working...' : children}
    </button>
  )
}

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [ollamaStatus, setOllamaStatus] = useState(null)
  const [imapStatus, setImapStatus] = useState(null)
  const [saving, setSaving] = useState({})
  const [feedback, setFeedback] = useState({})
  const [loading, setLoading] = useState({})

  useEffect(() => {
    api.settings.get().then(setSettings)
    api.draft.status().then(setOllamaStatus).catch(() => setOllamaStatus({ running: false }))
    api.email.status().then(setImapStatus).catch(() => setImapStatus({ connected: false }))
  }, [])

  function set(path, value) {
    setSettings(s => {
      const parts = path.split('.')
      const next = { ...s }
      let cur = next
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = { ...cur[parts[i]] }
        cur = cur[parts[i]]
      }
      cur[parts[parts.length - 1]] = value
      return next
    })
  }

  async function save(section) {
    setSaving(s => ({ ...s, [section]: true }))
    try {
      await api.settings.update({ [section]: settings[section] })
      setFeedback(f => ({ ...f, [section]: { ok: true, msg: 'Saved.' } }))
      setTimeout(() => setFeedback(f => ({ ...f, [section]: null })), 2000)
      // Refresh statuses
      if (section === 'ollama') api.draft.status().then(setOllamaStatus).catch(() => {})
      if (section === 'imap') api.email.status().then(setImapStatus).catch(() => {})
    } catch (err) {
      setFeedback(f => ({ ...f, [section]: { ok: false, msg: err.message } }))
    }
    setSaving(s => ({ ...s, [section]: false }))
  }

  async function run(key, fn) {
    setLoading(l => ({ ...l, [key]: true }))
    try {
      const result = await fn()
      setFeedback(f => ({ ...f, [key]: { ok: true, msg: result?.message || result?.msg || 'Done.' } }))
      setTimeout(() => setFeedback(f => ({ ...f, [key]: null })), 4000)
    } catch (err) {
      const msg = err.message?.includes('{') ? (() => { try { return JSON.parse(err.message).error } catch { return err.message } })() : err.message
      setFeedback(f => ({ ...f, [key]: { ok: false, msg } }))
    }
    setLoading(l => ({ ...l, [key]: false }))
  }

  if (!settings) return (
    <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Loading...</div>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Integrations</h1>
        <p className="text-sm text-zinc-500 mt-1">All local. No paid APIs. Your data stays on your machine.</p>
      </div>

      {/* Ollama — AI Drafts */}
      <Card
        icon="✦"
        name="Ollama — AI Follow-up Drafts"
        description="Local LLM that generates context-aware follow-up messages. Free, runs on your machine."
        connected={ollamaStatus?.running}
        connectedLabel="NOT RUNNING"
      >
        {ollamaStatus?.running ? (
          <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            ✓ Ollama running · {ollamaStatus.models?.length ?? 0} model{ollamaStatus.models?.length !== 1 ? 's' : ''} available
            {ollamaStatus.models?.length > 0 && ` (${ollamaStatus.models.slice(0, 3).join(', ')})`}
          </div>
        ) : (
          <div className="bg-zinc-800/60 rounded-lg p-3 text-xs text-zinc-500 space-y-1">
            <p className="text-zinc-400 font-medium">Setup (one-time, free):</p>
            <p>1. Download Ollama at <span className="text-zinc-300">ollama.com</span></p>
            <p>2. Run: <code className="bg-zinc-700 px-1 rounded">ollama pull llama3.2</code></p>
            <p>3. Ollama runs in the background automatically after install</p>
          </div>
        )}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Model</label>
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            value={settings.ollama.model}
            onChange={e => set('ollama.model', e.target.value)}
            placeholder="llama3.2"
          />
          <p className="text-[11px] text-zinc-600 mt-1">
            If Ollama isn't running, drafts fall back to smart templates automatically.
          </p>
        </div>
        {feedback.ollama && (
          <p className={`text-xs ${feedback.ollama.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.ollama.msg}</p>
        )}
        <div className="flex gap-2">
          <Btn onClick={() => save('ollama')} loading={saving.ollama}>Save</Btn>
          <Btn variant="secondary" onClick={() => api.draft.status().then(setOllamaStatus)}>Check status</Btn>
        </div>
      </Card>

      {/* IMAP Email */}
      <Card
        icon="✉"
        name="Email — IMAP"
        description="Connect any email account directly via IMAP. No OAuth, no Google account required. Works with Gmail, Outlook, Fastmail, anything."
        connected={imapStatus?.connected}
      >
        {imapStatus?.connected && (
          <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            ✓ Connected as {imapStatus.email}
          </div>
        )}
        {imapStatus?.error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            ✗ {imapStatus.error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="IMAP Host" value={settings.imap.host} onChange={v => set('imap.host', v)} placeholder="imap.gmail.com" />
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Port</label>
            <input type="number" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              value={settings.imap.port} onChange={e => set('imap.port', Number(e.target.value))} />
          </div>
        </div>
        <Field label="Email Address" value={settings.imap.email} onChange={v => set('imap.email', v)} placeholder="you@gmail.com" />
        <Field label="Password / App Password" type="password" value={settings.imap.password} onChange={v => set('imap.password', v)} placeholder="xxxx xxxx xxxx xxxx" />
        <div className="bg-zinc-800/60 rounded-lg p-3 text-xs text-zinc-500 space-y-1">
          <p className="text-zinc-400 font-medium">Gmail setup (recommended):</p>
          <p>1. Enable 2FA on your Google account</p>
          <p>2. Go to myaccount.google.com → Security → App passwords</p>
          <p>3. Generate a password for "Mail" — use that above</p>
          <p className="text-zinc-600 mt-1">Outlook: use imap.outlook.com · Fastmail: imap.fastmail.com</p>
        </div>
        {feedback.imap && (
          <p className={`text-xs ${feedback.imap.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.imap.msg}</p>
        )}
        {feedback.imap_test && (
          <p className={`text-xs ${feedback.imap_test.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.imap_test.msg}</p>
        )}
        <div className="flex gap-2">
          <Btn onClick={() => save('imap')} loading={saving.imap}>Save</Btn>
          <Btn variant="secondary" loading={loading.imap_test}
            onClick={() => run('imap_test', () => api.email.test())}>
            Test connection
          </Btn>
        </div>
      </Card>

      {/* Notifications */}
      <Card
        icon="🔔"
        name="Notifications"
        description="In-app notification center + optional browser alerts for overdue tasks, stalling deals, and at-risk contacts."
        connected={settings.notifications.browser_enabled}
        connectedLabel="IN-APP ONLY"
      >
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer" onClick={() => set('notifications.browser_enabled', !settings.notifications.browser_enabled)}>
            <div className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${settings.notifications.browser_enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
              <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${settings.notifications.browser_enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-zinc-400">Browser desktop alerts</span>
          </label>
        </div>
        <p className="text-xs text-zinc-600">
          The notification bell in the sidebar updates every minute automatically. Browser alerts appear when there are urgent items.
        </p>
        {feedback.notifications && (
          <p className={`text-xs ${feedback.notifications.ok ? 'text-emerald-400' : 'text-red-400'}`}>{feedback.notifications.msg}</p>
        )}
        <div className="flex gap-2">
          <Btn onClick={() => save('notifications')} loading={saving.notifications}>Save</Btn>
          <Btn variant="secondary" onClick={async () => {
            const perm = await Notification.requestPermission()
            setFeedback(f => ({ ...f, notifications: { ok: perm === 'granted', msg: perm === 'granted' ? 'Browser alerts enabled.' : 'Permission denied by browser.' } }))
          }}>
            Enable browser alerts
          </Btn>
        </div>
      </Card>

      {/* Calendar */}
      <Card
        icon="📅"
        name="Calendar"
        description="Built-in meeting tracker. Schedule meetings, view upcoming and past. No external calendar needed."
        connected={true}
        connectedLabel="BUILT-IN"
      >
        <p className="text-xs text-zinc-500">
          Log meetings as interactions (type: meeting) from any contact. Use the Calendar page to view all meetings chronologically and schedule new ones.
        </p>
        <p className="text-xs text-zinc-600">
          Tip: set a future date when logging a meeting to schedule it. It will appear under "Upcoming" in the Calendar view.
        </p>
      </Card>

      {/* Notes */}
      <Card
        icon="◻"
        name="Notes"
        description="Built-in note-taking per contact. No Notion required — notes live alongside your CRM data."
        connected={true}
        connectedLabel="BUILT-IN"
      >
        <p className="text-xs text-zinc-500">
          Open any contact → Notes section. Notes are stored locally and linked directly to the contact. Use the Context field for quick reference notes, the Notes log for ongoing entries.
        </p>
      </Card>

      {/* LinkedIn note */}
      <Card
        icon="🔗"
        name="LinkedIn"
        description="LinkedIn doesn't allow third-party API access. Track outreach manually."
        connected={false}
        connectedLabel="MANUAL"
      >
        <p className="text-xs text-zinc-500">
          Store LinkedIn profile URLs per contact. Log DMs as interactions using the "DM" type. Track reply status in the interaction summary.
        </p>
      </Card>
    </div>
  )
}
