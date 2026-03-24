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
  const activeStages = ['prospect', 'in conversation', 'proposal sent']

  const notifications = []

  // Overdue tasks
  tasks
    .filter(t => t.status !== 'done' && t.due_date && isPast(parseISO(t.due_date)))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .forEach(t => {
      const daysOverdue = Math.floor((Date.now() - new Date(t.due_date)) / 86400000)
      notifications.push({
        id: `task-${t.id}`,
        type: 'overdue_task',
        severity: 'high',
        title: t.title,
        detail: `${daysOverdue}d overdue`,
        linked_contact: t.linked_contact,
        linked_opportunity: t.linked_opportunity,
        entity_id: t.id,
      })
    })

  // At-risk contacts (cold + open deal)
  enrichedContacts
    .filter(c => c.at_risk)
    .forEach(c => {
      notifications.push({
        id: `risk-${c.id}`,
        type: 'at_risk',
        severity: 'high',
        title: `${c.name} is at risk`,
        detail: `${c.days_since_contact}d since last contact · ${c.open_opportunity?.title || 'open deal'}`,
        linked_contact: c.id,
        linked_opportunity: c.open_opportunity?.id || null,
        entity_id: c.id,
      })
    })

  // Stalling deals
  enrichedOpps
    .filter(o => activeStages.includes(o.stage) && o.stalling)
    .forEach(o => {
      notifications.push({
        id: `stall-${o.id}`,
        type: 'stalling_deal',
        severity: 'medium',
        title: `${o.title} is stalling`,
        detail: `${o.days_since_activity}d without activity · ${o.stage}`,
        linked_contact: o.linked_contact,
        linked_opportunity: o.id,
        entity_id: o.id,
      })
    })

  // Warm contacts not pinged in 14+ days
  enrichedContacts
    .filter(c => c.warmth === 'warm' && c.days_since_contact >= 14 && !c.at_risk)
    .forEach(c => {
      notifications.push({
        id: `warm-${c.id}`,
        type: 'warm_ping',
        severity: 'low',
        title: `Ping ${c.name}`,
        detail: `Warm · ${c.days_since_contact}d since contact${c.open_opportunity ? ` · ${c.open_opportunity.title}` : ''}`,
        linked_contact: c.id,
        linked_opportunity: c.open_opportunity?.id || null,
        entity_id: c.id,
      })
    })

  const counts = {
    high: notifications.filter(n => n.severity === 'high').length,
    medium: notifications.filter(n => n.severity === 'medium').length,
    low: notifications.filter(n => n.severity === 'low').length,
    total: notifications.length,
  }

  res.json({ notifications, counts })
})

export default router
