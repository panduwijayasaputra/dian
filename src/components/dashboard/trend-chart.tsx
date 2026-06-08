'use client'

import { Bar, BarChart, XAxis, YAxis } from 'recharts'
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
      <h2 className="mb-4 text-base font-semibold text-slate-900">
        Tren Unggahan (30 Hari Terakhir)
      </h2>
      {isEmpty ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          Belum ada data.
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
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
            <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </Card>
  )
}
