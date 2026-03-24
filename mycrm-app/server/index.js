import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import contactsRouter from './routes/contacts.js'
import opportunitiesRouter from './routes/opportunities.js'
import interactionsRouter from './routes/interactions.js'
import tasksRouter from './routes/tasks.js'
import notesRouter from './routes/notes.js'
import briefingRouter from './routes/briefing.js'
import settingsRouter, { readSettings } from './routes/settings.js'
import draftRouter from './routes/draft.js'
import emailRouter from './routes/email.js'
import notificationsRouter from './routes/notifications.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/contacts', contactsRouter)
app.use('/api/opportunities', opportunitiesRouter)
app.use('/api/interactions', interactionsRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/notes', notesRouter)
app.use('/api/briefing', briefingRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/draft', draftRouter)
app.use('/api/email', emailRouter)
app.use('/api/notifications', notificationsRouter)

const PORT = 3001
app.listen(PORT, () => {
  console.log(`CRM API running on http://localhost:${PORT}`)
})
