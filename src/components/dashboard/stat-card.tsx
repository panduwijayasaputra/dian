import { type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

type Props = {
  label: string
  value: number | string
  icon: LucideIcon
  change?: number
  suffix?: string
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return <p className="mt-1 text-xs text-green-600">+{change} dari bulan lalu</p>
  }
  if (change < 0) {
    return <p className="mt-1 text-xs text-red-500">{change} dari bulan lalu</p>
  }
  return <p className="mt-1 text-xs text-slate-400">sama seperti bulan lalu</p>
}

export function StatCard({ label, value, icon: Icon, change, suffix }: Props) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {suffix !== undefined ? (
            <p className="mt-1 text-xs text-slate-400">{suffix}</p>
          ) : change !== undefined ? (
            <ChangeIndicator change={change} />
          ) : null}
        </div>
        <div className="rounded-lg bg-accent p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  )
}
