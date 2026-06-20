'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { TrendDataPoint } from '@/lib/dashboard'

const chartConfig: ChartConfig = {
  count: { label: 'Dokumen' },
}

type Props = {
  data: TrendDataPoint[]
}

export function TrendChart({ data }: Props) {
  const isEmpty = data.every((d) => d.count === 0)

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="rounded-lg bg-blue-50 p-1.5">
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Tren Unggahan</h2>
          <p className="text-xs text-slate-400">30 hari terakhir</p>
        </div>
      </div>
      {isEmpty ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          Belum ada data.
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="url(#trendGradient)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </Card>
  )
}
