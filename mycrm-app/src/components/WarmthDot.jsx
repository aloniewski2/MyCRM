import { warmthBadge } from '../utils'

export default function WarmthDot({ warmth, atRisk, size = 'sm' }) {
  const { label, cls } = warmthBadge(warmth, atRisk)
  const sz = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
  return (
    <span className={`inline-flex items-center rounded font-semibold tracking-wider ${sz} ${cls}`}>
      {label}
    </span>
  )
}
