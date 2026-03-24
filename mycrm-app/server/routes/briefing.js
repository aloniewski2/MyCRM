import { Router } from 'express'
import { read } from '../db.js'
import { enrichContact, enrichOpportunity, daysSince } from '../warmth.js'
import { parseISO, isPast } from 'date-fns'

const router = Router()

router.get('/', (req, res) => {
  const contacts = read('contacts')
  const interactions = read('interactions')
  const opportunities = read('opportunities')
  const tasks = read('tasks')

  const enrichedContacts = contacts.map(c => enrichContact(c, interactions, opportunities))
  const enrichedOpps = opportunities.map(o => enrichOpportunity(o, interactions, contacts))

  // Overdue tasks
  const overdue = tasks.filter(t => {
    if (t.status === 'done') return false
    if (!t.due_date) return false
    return isPast(parseISO(t.due_date))
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  // Warm contacts to ping (warm or hot, no interaction in last 3 days, or cold+at-risk)
  const toPing = enrichedContacts.filter(c => {
    if (c.warmth === 'hot' && c.days_since_contact <= 3) return false
    if (c.warmth === 'hot') return true
    if (c.warmth === 'warm') return true
    if (c.at_risk) return true
    return false
  }).sort((a, b) => (a.days_since_contact || 999) - (b.days_since_contact || 999))

  // Deals with activity this week or stalling with open stage
  const activeStages = ['prospect', 'in conversation', 'proposal sent']
  const dealsThisWeek = enrichedOpps
    .filter(o => activeStages.includes(o.stage))
    .sort((a, b) => (a.days_since_activity || 999) - (b.days_since_activity || 999))

  res.json({
    overdue,
    to_ping: toPing.slice(0, 8),
    deals_this_week: dealsThisWeek,
    summary: {
      total_contacts: contacts.length,
      hot: enrichedContacts.filter(c => c.warmth === 'hot').length,
      warm: enrichedContacts.filter(c => c.warmth === 'warm').length,
      cold: enrichedContacts.filter(c => c.warmth === 'cold').length,
      at_risk: enrichedContacts.filter(c => c.at_risk).length,
      open_opportunities: enrichedOpps.filter(o => activeStages.includes(o.stage)).length,
      overdue_tasks: overdue.length,
    },
  })
})

export default router
