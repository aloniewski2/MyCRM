import Anthropic from '@anthropic-ai/sdk'
import { formatRelative } from '../utils.js'

export async function generateFollowUpDraft(apiKey, contact, lastInteraction, opportunity) {
  const client = new Anthropic({ apiKey })

  const contextParts = []
  if (contact.notes) contextParts.push(`Context: ${contact.notes}`)
  if (lastInteraction) {
    contextParts.push(`Last interaction: ${lastInteraction.type} on ${new Date(lastInteraction.date).toLocaleDateString()} — "${lastInteraction.summary}"`)
  } else {
    contextParts.push('No prior interactions logged.')
  }
  if (opportunity) {
    contextParts.push(`Active deal: ${opportunity.title} (${opportunity.stage}, $${opportunity.estimated_value})`)
    if (opportunity.next_action) contextParts.push(`Next action needed: ${opportunity.next_action}`)
  }

  const prompt = `You are writing a follow-up message on behalf of a solo freelance operator.

Contact: ${contact.name}, ${contact.role || 'unknown role'} at ${contact.company || 'unknown company'}
${contextParts.join('\n')}

Write a short, direct follow-up message. Rules:
- 2–4 sentences max
- Reference the last real thing that happened — never say "just checking in" or "hope this finds you well"
- No subject line, no greeting opener like "Hi [name]" — just the message body
- Specific and actionable
- Natural, not salesy
- First person

Return only the message body, nothing else.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].text.trim()
}
