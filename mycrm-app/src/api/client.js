const BASE = '/api'

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  contacts: {
    list: () => req('GET', '/contacts'),
    get: id => req('GET', `/contacts/${id}`),
    create: data => req('POST', '/contacts', data),
    update: (id, data) => req('PUT', `/contacts/${id}`, data),
    delete: id => req('DELETE', `/contacts/${id}`),
  },
  opportunities: {
    list: () => req('GET', '/opportunities'),
    get: id => req('GET', `/opportunities/${id}`),
    create: data => req('POST', '/opportunities', data),
    update: (id, data) => req('PUT', `/opportunities/${id}`, data),
    delete: id => req('DELETE', `/opportunities/${id}`),
  },
  interactions: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return req('GET', `/interactions${q ? '?' + q : ''}`)
    },
    create: data => req('POST', '/interactions', data),
    update: (id, data) => req('PUT', `/interactions/${id}`, data),
    delete: id => req('DELETE', `/interactions/${id}`),
  },
  tasks: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return req('GET', `/tasks${q ? '?' + q : ''}`)
    },
    create: data => req('POST', '/tasks', data),
    update: (id, data) => req('PUT', `/tasks/${id}`, data),
    delete: id => req('DELETE', `/tasks/${id}`),
  },
  notes: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return req('GET', `/notes${q ? '?' + q : ''}`)
    },
    create: data => req('POST', '/notes', data),
    update: (id, data) => req('PUT', `/notes/${id}`, data),
    delete: id => req('DELETE', `/notes/${id}`),
  },
  briefing: {
    get: () => req('GET', '/briefing'),
  },
  settings: {
    get: () => req('GET', '/settings'),
    update: data => req('PUT', '/settings', data),
    status: () => req('GET', '/settings/status'),
  },
  draft: {
    generate: contactId => req('POST', `/draft/${contactId}`),
    status: () => req('GET', '/draft/status'),
  },
  email: {
    status: () => req('GET', '/email/status'),
    test: () => req('POST', '/email/test'),
    getForContact: contactId => req('GET', `/email/contact/${contactId}`),
    getThreads: contactId => req('GET', `/email/contact/${contactId}/threads`),
  },
  notifications: {
    get: () => req('GET', '/notifications'),
  },
}
