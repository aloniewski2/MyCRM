import { ImapFlow } from 'imapflow'

export async function testImapConnection(config) {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.email, pass: config.password },
    logger: false,
  })
  await client.connect()
  await client.logout()
  return true
}

export async function getEmailsForContact(config, contactEmail) {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.email, pass: config.password },
    logger: false,
  })

  await client.connect()

  try {
    await client.mailboxOpen('INBOX')

    // Search for emails to or from the contact
    const uids = await client.search({
      or: [
        { to: contactEmail },
        { from: contactEmail },
      ],
    }, { uid: true })

    if (!uids || uids.length === 0) {
      return { found: false, total: 0 }
    }

    // Fetch the most recent message
    const latestUid = uids[uids.length - 1]
    const msg = await client.fetchOne(`${latestUid}`, {
      envelope: true,
      flags: true,
    }, { uid: true })

    if (!msg) return { found: false, total: 0 }

    const envelope = msg.envelope
    const fromAddr = envelope.from?.[0]?.address?.toLowerCase() || ''
    const isFromContact = fromAddr === contactEmail.toLowerCase()
    const isFromMe = !isFromContact

    const msgDate = envelope.date ? new Date(envelope.date) : new Date()
    const daysSince = Math.floor((Date.now() - msgDate.getTime()) / 86400000)
    const noReplyAlert = isFromMe && daysSince >= 5

    return {
      found: true,
      total: uids.length,
      subject: envelope.subject || '(no subject)',
      from: envelope.from?.[0]?.address || '',
      from_name: envelope.from?.[0]?.name || '',
      date: msgDate.toISOString(),
      days_since: daysSince,
      direction: isFromMe ? 'sent' : 'received',
      no_reply_alert: noReplyAlert,
      no_reply_days: noReplyAlert ? daysSince : null,
    }
  } finally {
    await client.logout()
  }
}

export async function getRecentThreads(config, contactEmail, limit = 5) {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.email, pass: config.password },
    logger: false,
  })

  await client.connect()

  try {
    await client.mailboxOpen('INBOX')

    const uids = await client.search({
      or: [{ to: contactEmail }, { from: contactEmail }],
    }, { uid: true })

    if (!uids || uids.length === 0) return []

    const recentUids = uids.slice(-limit).reverse()
    const threads = []

    for (const uid of recentUids) {
      const msg = await client.fetchOne(`${uid}`, { envelope: true }, { uid: true })
      if (!msg?.envelope) continue
      const env = msg.envelope
      const fromAddr = env.from?.[0]?.address?.toLowerCase() || ''
      threads.push({
        uid,
        subject: env.subject || '(no subject)',
        from: env.from?.[0]?.address || '',
        from_name: env.from?.[0]?.name || '',
        date: env.date ? new Date(env.date).toISOString() : null,
        direction: fromAddr === contactEmail.toLowerCase() ? 'received' : 'sent',
      })
    }

    return threads
  } finally {
    await client.logout()
  }
}
