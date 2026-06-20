import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'

type Color = 'blue' | 'emerald' | 'violet' | 'amber'

type Props = {
  label: string
  value: number | string
  icon: LucideIcon
  change?: number
  suffix?: string
  color?: Color
}

const iconColors: Record<Color, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
        <TrendingUp className="h-3 w-3" />
        +{change} dari bulan lalu
      </p>
    )
  }
  if (change < 0) {
    return (
      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
        <TrendingDown className="h-3 w-3" />
        {change} dari bulan lalu
      </p>
    )
  }
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
      <Minus className="h-3 w-3" />
      Sama seperti bulan lalu
    </p>
  )
}

export function StatCard({ label, value, icon: Icon, change, suffix, color = 'blue' }: Props) {
  return (
    <Card className="p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
          {suffix !== undefined ? (
            <p className="mt-1.5 text-xs text-slate-400">{suffix}</p>
          ) : change !== undefined ? (
            <ChangeIndicator change={change} />
          ) : null}
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${iconColors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  )
}
