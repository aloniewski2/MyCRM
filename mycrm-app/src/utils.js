export function warmthBadge(warmth, atRisk) {
  if (atRisk) return { label: 'AT RISK', cls: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' }
  if (warmth === 'hot') return { label: 'HOT', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' }
  if (warmth === 'warm') return { label: 'WARM', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' }
  return { label: 'COLD', cls: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/40' }
}

export function stageBadge(stage) {
  const map = {
    'prospect': { label: 'Prospect', cls: 'bg-zinc-700/40 text-zinc-300' },
    'in conversation': { label: 'In Conversation', cls: 'bg-blue-500/20 text-blue-400' },
    'proposal sent': { label: 'Proposal Sent', cls: 'bg-violet-500/20 text-violet-400' },
    'closed/won': { label: 'Won', cls: 'bg-emerald-500/20 text-emerald-400' },
    'closed/lost': { label: 'Lost', cls: 'bg-zinc-600/30 text-zinc-500' },
  }
  return map[stage] || { label: stage, cls: 'bg-zinc-700/40 text-zinc-300' }
}

export function priorityBadge(priority) {
  if (priority === 'high') return 'text-red-400'
  if (priority === 'medium') return 'text-amber-400'
  return 'text-zinc-500'
}

export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatRelative(d) {
  if (!d) return '—'
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export function formatCurrency(n) {
  return `$${Number(n).toLocaleString()}`
}

export function isOverdue(due_date) {
  if (!due_date) return false
  return new Date(due_date) < new Date()
}

export const STAGES = ['prospect', 'in conversation', 'proposal sent', 'closed/won', 'closed/lost']
export const INTERACTION_TYPES = ['email', 'meeting', 'DM', 'call']
export const TAGS = ['warm-lead', 'past-client', 'referral-source', 'dormant', 'mentor', 'investor']
