import { getHexColor } from '@/lib/division-colors'

interface DivisionBadgeProps {
  name: string
  color?: string | null
}

export function DivisionBadge({ name, color }: DivisionBadgeProps) {
  const hex = getHexColor(color)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${hex}26`, color: hex }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: hex }} />
      {name}
    </span>
  )
}
