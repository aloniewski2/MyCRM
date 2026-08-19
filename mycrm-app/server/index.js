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
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

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

// In production the API also serves the built client, so the whole app is one
// service on one port instead of two deploys and a CORS problem.
const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

// Hosts assign the port at runtime and expect a bind on 0.0.0.0; a hardcoded
// localhost:3001 works on a laptop and is unreachable in a container.
const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CRM API running on port ${PORT}`)
})
