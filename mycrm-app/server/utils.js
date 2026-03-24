export function formatRelative(d) {
  if (!d) return 'never'
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
