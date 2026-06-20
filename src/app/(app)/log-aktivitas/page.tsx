import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { LogActivityView } from './log-activity-view'

const DEFAULT_PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{
    userId?: string
    category?: string
    from?: string
    to?: string
    page?: string
    pageSize?: string
  }>
}

export default async function LogAktivitasPage({ searchParams }: Props) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const pageSize = [10, 20, 50].includes(Number(params.pageSize))
    ? Number(params.pageSize)
    : DEFAULT_PAGE_SIZE
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}
  if (params.userId) where.userId = params.userId
  if (params.category) where.action = { startsWith: params.category + '_' }
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to + 'T23:59:59') } : {}),
    }
  }

  const [logs, total, users] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { user: { select: { name: true } } },
    }),
    prisma.activityLog.count({ where }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log Aktivitas</h1>
        <p className="mt-1 text-sm text-slate-500">{total} entri ditemukan</p>
      </div>

      <LogActivityView
        logs={logs}
        total={total}
        page={page}
        pageSize={pageSize}
        users={users}
        initialUserId={params.userId}
        initialCategory={params.category}
        initialFrom={params.from}
        initialTo={params.to}
      />
    </div>
  )
}
