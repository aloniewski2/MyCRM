import { Router } from 'express'
import { read } from '../db.js'
import { readSettings } from './settings.js'
import { checkOllama, generateDraft, templateDraft } from '../integrations/ollama.js'

const router = Router()

router.get('/status', async (req, res) => {
  const s = readSettings()
  const status = await checkOllama(s.ollama.base_url)
  res.json({ ...status, model: s.ollama.model, base_url: s.ollama.base_url })
})

router.post('/:contactId', async (req, res) => {
  try {
    const contacts = read('contacts')
    const contact = contacts.find(c => c.id === req.params.contactId)
    if (!contact) return res.status(404).json({ error: 'Contact not found' })

    const interactions = read('interactions')
    const opportunities = read('opportunities')

    const lastInteraction = interactions
      .filter(i => i.linked_contact === contact.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null

    const opportunity = opportunities.find(
      o => o.linked_contact === contact.id && o.stage !== 'closed/won' && o.stage !== 'closed/lost'
    ) || null

    const s = readSettings()
    const ollamaStatus = await checkOllama(s.ollama.base_url)

    let draft, source

    if (ollamaStatus.running) {
      try {
        draft = await generateDraft(s.ollama.base_url, s.ollama.model, contact, lastInteraction, opportunity)
        source = 'ollama'
      } catch (err) {
        draft = templateDraft(contact, lastInteraction, opportunity)
        source = 'template'
      }
    } else {
      draft = templateDraft(contact, lastInteraction, opportunity)
      source = 'template'
    }

    res.json({ draft, source })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
