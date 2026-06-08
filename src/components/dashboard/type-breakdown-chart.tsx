'use client'

import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { TypeBreakdownItem } from '@/lib/dashboard'

const chartConfig: ChartConfig = {
  count: { label: 'Dokumen' },
}

type Props = {
  data: TypeBreakdownItem[]
}

export function TypeBreakdownChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Distribusi Jenis Dokumen</h2>
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          Belum ada data.
        </div>
      </Card>
    )
  }

  const chartHeight = Math.max(data.length * 40, 160)

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-base font-semibold text-slate-900">Distribusi Jenis Dokumen</h2>
      <ChartContainer config={chartConfig} style={{ height: chartHeight }} className="w-full">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    </Card>
  )
}
