export async function postToSlack(webhookUrl, blocks) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  })
  if (!res.ok) throw new Error(`Slack error: ${res.status} ${await res.text()}`)
}

export function buildBriefingBlocks(briefing) {
  const { overdue, to_ping, deals_this_week, summary } = briefing
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📋 CRM Daily Briefing — ${today}` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*🔴 Hot*\n${summary.hot} contacts` },
        { type: 'mrkdwn', text: `*🟡 Warm*\n${summary.warm} contacts` },
        { type: 'mrkdwn', text: `*💼 Open Deals*\n${summary.open_opportunities}` },
        { type: 'mrkdwn', text: `*⚠️ At Risk*\n${summary.at_risk} deals` },
      ],
    },
    { type: 'divider' },
  ]

  if (overdue.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*🔴 Overdue Tasks (${overdue.length})*` },
    })
    overdue.slice(0, 5).forEach(t => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${t.title}* — due ${new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${t.priority.toUpperCase()}`,
        },
      })
    })
    blocks.push({ type: 'divider' })
  }

  if (to_ping.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*🟡 Warm Contacts to Ping (${to_ping.length})*` },
    })
    to_ping.slice(0, 5).forEach(c => {
      const warmthEmoji = c.warmth === 'hot' ? '🔴' : c.at_risk ? '⚠️' : '🟡'
      const lastContact = c.last_touched
        ? `${Math.floor((Date.now() - new Date(c.last_touched)) / 86400000)}d ago`
        : 'never'
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${warmthEmoji} *${c.name}* · ${c.role || ''} at ${c.company || ''} · last contact: ${lastContact}${c.open_opportunity ? `\n  ↳ ${c.open_opportunity.title}` : ''}`,
        },
      })
    })
    blocks.push({ type: 'divider' })
  }

  if (deals_this_week.length > 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*💼 Active Deals*` },
    })
    deals_this_week.slice(0, 5).forEach(o => {
      const stallingFlag = o.stalling ? ' ⚠️ *STALLING*' : ''
      const days = o.days_since_activity != null ? `${o.days_since_activity}d ago` : 'never'
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${o.title}*${stallingFlag}\n  ${o.stage} · $${Number(o.estimated_value).toLocaleString()} · last activity: ${days}${o.next_action ? `\n  → ${o.next_action}` : ''}`,
        },
      })
    })
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: 'Sent by MyCRM · Personal Pipeline' }],
  })

  return blocks
}
