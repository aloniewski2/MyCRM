import { Router } from 'express'
import { read } from '../db.js'
import { readSettings } from './settings.js'
import { postToSlack, buildBriefingBlocks } from '../integrations/slack.js'
import { enrichContact, enrichOpportunity } from '../warmth.js'
import { parseISO, isPast } from 'date-fns'

const router = Router()

async function getBriefingData() {
  const contacts = read('contacts')
  const interactions = read('interactions')
  const opportunities = read('opportunities')
  const tasks = read('tasks')

  const enrichedContacts = contacts.map(c => enrichContact(c, interactions, opportunities))
  const enrichedOpps = opportunities.map(o => enrichOpportunity(o, interactions, contacts))

  const activeStages = ['prospect', 'in conversation', 'proposal sent']

  const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && isPast(parseISO(t.due_date)))
  const toPing = enrichedContacts.filter(c => c.warmth === 'hot' || c.warmth === 'warm' || c.at_risk)
  const dealsThisWeek = enrichedOpps.filter(o => activeStages.includes(o.stage))

  return {
    overdue, to_ping: toPing, deals_this_week: dealsThisWeek,
    summary: {
      hot: enrichedContacts.filter(c => c.warmth === 'hot').length,
      warm: enrichedContacts.filter(c => c.warmth === 'warm').length,
      at_risk: enrichedContacts.filter(c => c.at_risk).length,
      open_opportunities: dealsThisWeek.length,
    },
  }
}

router.post('/briefing', async (req, res) => {
  try {
    const settings = readSettings()
    if (!settings.slack.webhook_url) {
      return res.status(400).json({ error: 'Slack webhook URL not configured.' })
    }
    const briefing = await getBriefingData()
    const blocks = buildBriefingBlocks(briefing)
    await postToSlack(settings.slack.webhook_url, blocks)
    res.json({ ok: true, message: 'Briefing sent to Slack.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/test', async (req, res) => {
  try {
    const settings = readSettings()
    if (!settings.slack.webhook_url) {
      return res.status(400).json({ error: 'Slack webhook URL not configured.' })
    }
    await postToSlack(settings.slack.webhook_url, [
      { type: 'section', text: { type: 'mrkdwn', text: '✅ *MyCRM connected to Slack.* Your daily briefings will appear here.' } },
    ])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export { getBriefingData }
export default router
