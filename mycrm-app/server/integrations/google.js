import { google } from 'googleapis'

const REDIRECT_URI = 'http://localhost:3001/api/google/callback'
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function createOAuthClient(clientId, clientSecret) {
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)
}

export function getAuthUrl(client) {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export function setCredentials(client, settings) {
  client.setCredentials({
    access_token: settings.google.access_token,
    refresh_token: settings.google.refresh_token,
    expiry_date: settings.google.token_expiry,
  })
}

export async function exchangeCode(client, code) {
  const { tokens } = await client.getToken(code)
  return tokens
}

export async function getConnectedEmail(client) {
  const oauth2 = google.oauth2({ version: 'v2', auth: client })
  const { data } = await oauth2.userinfo.get()
  return data.email
}

export async function getGmailDataForContact(client, contactEmail) {
  if (!contactEmail) return null
  const gmail = google.gmail({ version: 'v1', auth: client })

  const query = `to:${contactEmail} OR from:${contactEmail}`
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 10,
  })

  const messages = listRes.data.messages || []
  if (messages.length === 0) return { found: false, message: 'No email threads found with this contact.' }

  // Get the most recent message
  const msgRes = await gmail.users.messages.get({
    userId: 'me',
    id: messages[0].id,
    format: 'metadata',
    metadataHeaders: ['Subject', 'From', 'To', 'Date'],
  })

  const headers = msgRes.data.payload?.headers || []
  const get = name => headers.find(h => h.name === name)?.value || ''

  const subject = get('Subject')
  const from = get('From')
  const date = get('Date')
  const isFromMe = from.toLowerCase().includes('me') || !from.includes(contactEmail)

  // Check for no-reply: latest message is outbound (from me) and it's been 5+ days
  const msgDate = new Date(date)
  const daysSince = Math.floor((Date.now() - msgDate.getTime()) / 86400000)
  const noReplyAlert = isFromMe && daysSince >= 5

  return {
    found: true,
    subject,
    from,
    date: msgDate.toISOString(),
    days_since: daysSince,
    total_threads: messages.length,
    no_reply_alert: noReplyAlert,
    no_reply_days: noReplyAlert ? daysSince : null,
  }
}

export async function getCalendarEventsForContact(client, contactEmail, contactName) {
  const calendar = google.calendar({ version: 'v3', auth: client })

  const now = new Date()
  const past30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: past30,
    timeMax: next30,
    maxResults: 50,
    singleEvents: true,
    orderBy: 'startTime',
    q: contactEmail || contactName,
  })

  const events = (res.data.items || []).filter(event => {
    const attendees = event.attendees || []
    const inAttendees = attendees.some(a =>
      (contactEmail && a.email?.toLowerCase() === contactEmail.toLowerCase()) ||
      (contactName && a.displayName?.toLowerCase().includes(contactName.toLowerCase()))
    )
    const inSummary = (event.summary || '').toLowerCase().includes((contactName || '').toLowerCase())
    return inAttendees || inSummary
  })

  const upcoming = events.filter(e => new Date(e.start?.dateTime || e.start?.date) > now)
  const past = events.filter(e => new Date(e.start?.dateTime || e.start?.date) <= now)

  return {
    upcoming: upcoming.slice(0, 3).map(formatEvent),
    recent: past.slice(-3).reverse().map(formatEvent),
  }
}

function formatEvent(event) {
  const start = event.start?.dateTime || event.start?.date
  return {
    id: event.id,
    title: event.summary || '(no title)',
    start,
    attendees: (event.attendees || []).map(a => a.email).filter(Boolean),
    hangout_link: event.hangoutLink || null,
  }
}
