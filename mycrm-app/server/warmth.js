import { differenceInDays, parseISO } from 'date-fns'

export function computeWarmth(lastTouched) {
  if (!lastTouched) return 'cold'
  const days = differenceInDays(new Date(), parseISO(lastTouched))
  if (days <= 7) return 'hot'
  if (days <= 30) return 'warm'
  return 'cold'
}

export function daysSince(dateStr) {
  if (!dateStr) return null
  return differenceInDays(new Date(), parseISO(dateStr))
}

export function enrichContact(contact, interactions, opportunities) {
  const contactInteractions = interactions
    .filter(i => i.linked_contact === contact.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const lastInteraction = contactInteractions[0] || null
  const lastTouched = lastInteraction?.date || contact.last_touched || null

  const warmth = computeWarmth(lastTouched)

  const openOpp = opportunities.find(
    o => o.linked_contact === contact.id && o.stage !== 'closed/won' && o.stage !== 'closed/lost'
  ) || null

  const atRisk = warmth === 'cold' && openOpp !== null

  const stalling = openOpp
    ? daysSince(openOpp.last_activity || lastTouched) >= 7
    : false

  return {
    ...contact,
    warmth,
    last_touched: lastTouched,
    last_interaction: lastInteraction,
    open_opportunity: openOpp,
    at_risk: atRisk,
    stalling,
    days_since_contact: lastTouched ? daysSince(lastTouched) : null,
  }
}

export function enrichOpportunity(opp, interactions, contacts) {
  const oppInteractions = interactions
    .filter(i => i.linked_opportunity === opp.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const lastActivity = oppInteractions[0]?.date || opp.last_activity || null
  const days = lastActivity ? daysSince(lastActivity) : null
  const stalling = days !== null ? days >= 7 : true

  const contact = contacts.find(c => c.id === opp.linked_contact) || null

  return { ...opp, last_activity: lastActivity, days_since_activity: days, stalling, contact }
}
