import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const PAGE_SIZE = 50

const CATEGORIES = ['AUTH', 'DOCUMENT', 'USER', 'DIVISION'] as const

interface Props {
  searchParams: Promise<{
    userId?: string
    category?: string
    from?: string
    to?: string
    page?: string
  }>
}

export default async function LogAktivitasPage({ searchParams }: Props) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

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
      take: PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
    prisma.activityLog.count({ where }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const merged = { ...params, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    return `/log-aktivitas?${p.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log Aktivitas</h1>
        <p className="mt-1 text-sm text-slate-500">{total} entri ditemukan</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Pengguna</label>
          <select
            name="userId"
            defaultValue={params.userId ?? ''}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="">Semua Pengguna</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Kategori</label>
          <select
            name="category"
            defaultValue={params.category ?? ''}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="">Semua Kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Dari</label>
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ''}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Sampai</label>
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ''}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          />
        </div>

        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white"
        >
          Filter
        </button>
        <a
          href="/log-aktivitas"
          className="h-9 rounded-md border px-4 text-sm font-medium flex items-center"
        >
          Reset
        </a>
      </form>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Waktu</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead className="w-36">Resource ID</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-400 py-12">
                  Tidak ada log.
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                  {format(log.createdAt, 'dd MMM yyyy HH:mm:ss', { locale: localeId })}
                </TableCell>
                <TableCell className="text-sm">
                  {log.user?.name ?? <span className="text-slate-400 italic">System</span>}
                </TableCell>
                <TableCell>
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-mono font-medium bg-slate-100 text-slate-700">
                    {log.action}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-400">
                  {log.resourceId ? log.resourceId.slice(-8) : '—'}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {log.information ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end text-sm">
          {page > 1 && (
            <a href={buildUrl({ page: String(page - 1) })} className="rounded border px-3 py-1">
              ← Sebelumnya
            </a>
          )}
          <span className="text-slate-500">
            Halaman {page} dari {totalPages}
          </span>
          {page < totalPages && (
            <a href={buildUrl({ page: String(page + 1) })} className="rounded border px-3 py-1">
              Berikutnya →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
