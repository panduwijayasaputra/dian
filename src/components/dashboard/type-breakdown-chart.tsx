'use client'

import { Bar, BarChart, XAxis, YAxis } from 'recharts'
import { LayoutGrid } from 'lucide-react'
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
  const chartHeight = Math.max(data.length * 44, 160)

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="rounded-lg bg-violet-50 p-1.5">
          <LayoutGrid className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Distribusi Jenis Dokumen</h2>
          <p className="text-xs text-slate-400">Berdasarkan jenis surat</p>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-slate-400">
          Belum ada data.
        </div>
      ) : (
        <ChartContainer config={chartConfig} style={{ height: chartHeight }} className="w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="breakdownGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.85} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.45} />
              </linearGradient>
            </defs>
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
            <Bar dataKey="count" fill="url(#breakdownGradient)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </Card>
  )
}
