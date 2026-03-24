export async function checkOllama(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return { running: false }
    const data = await res.json()
    const models = (data.models || []).map(m => m.name)
    return { running: true, models }
  } catch {
    return { running: false, models: [] }
  }
}

export async function generateDraft(baseUrl, model, contact, lastInteraction, opportunity) {
  const contextParts = []
  if (contact.notes) contextParts.push(`Context: ${contact.notes}`)
  if (lastInteraction) {
    const date = new Date(lastInteraction.date).toLocaleDateString()
    contextParts.push(`Last interaction: ${lastInteraction.type} on ${date} — "${lastInteraction.summary}"`)
  } else {
    contextParts.push('No prior interactions logged.')
  }
  if (opportunity) {
    contextParts.push(`Active deal: ${opportunity.title} (${opportunity.stage}, $${opportunity.estimated_value})`)
    if (opportunity.next_action) contextParts.push(`Next action: ${opportunity.next_action}`)
  }

  const prompt = `You are writing a follow-up message for a solo freelance operator's CRM.

Contact: ${contact.name}, ${contact.role || 'unknown role'} at ${contact.company || 'unknown company'}
${contextParts.join('\n')}

Write a short, direct follow-up message body. Rules:
- 2 to 4 sentences max
- Reference the last real thing that happened, never say "just checking in" or "hope this finds you well"
- No subject line, no greeting opener
- Specific and actionable, natural tone, first person
- Plain text only

Reply with only the message body, nothing else.`

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ollama error: ${text}`)
  }

  const data = await res.json()
  return data.message?.content?.trim() || ''
}

export function templateDraft(contact, lastInteraction, opportunity) {
  const name = contact.name?.split(' ')[0] || 'there'

  if (!lastInteraction) {
    if (opportunity) {
      return `Wanted to follow up on ${opportunity.title} — ${opportunity.next_action || 'happy to answer any questions you have'}. Let me know where your head is at.`
    }
    return `Wanted to reach out directly — I've been thinking about your work at ${contact.company || 'your company'} and think there's a real fit here. Would love to find 20 minutes to connect.`
  }

  const daysSince = Math.floor((Date.now() - new Date(lastInteraction.date)) / 86400000)
  const recency = daysSince <= 3 ? 'the other day' : daysSince <= 10 ? 'last week' : `${Math.floor(daysSince / 7)} weeks ago`

  const typeIntros = {
    email: `Following up on my email from ${recency}`,
    meeting: `Great talking ${recency}`,
    call: `Good speaking ${recency}`,
    DM: `Following up on our conversation from ${recency}`,
  }
  const intro = typeIntros[lastInteraction.type] || `Following up from ${recency}`

  if (opportunity) {
    const stageLines = {
      prospect: `— still keen to explore ${opportunity.title} with you.`,
      'in conversation': `— wanted to keep the momentum going on ${opportunity.title}.`,
      'proposal sent': `— curious if you had a chance to review the proposal.`,
    }
    const stageLine = stageLines[opportunity.stage] || `on ${opportunity.title}.`
    return `${intro} ${stageLine} ${opportunity.next_action ? opportunity.next_action + '.' : 'Let me know what questions you have.'}`
  }

  return `${intro} — ${lastInteraction.summary?.split('.')[0] || 'wanted to keep the thread alive'}. What does your schedule look like this week?`
}
