'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { LogFilterForm } from './log-filter-form'

type Log = {
  id: string
  createdAt: Date
  action: string
  resourceId: string | null
  information: string | null
  user: { name: string } | null
}

interface LogActivityViewProps {
  logs: Log[]
  total: number
  page: number
  pageSize: number
  users: { id: string; name: string }[]
  initialUserId?: string
  initialCategory?: string
  initialFrom?: string
  initialTo?: string
}

const DEFAULT_PAGE_SIZE = 50

export function LogActivityView({
  logs,
  total,
  page,
  pageSize,
  users,
  initialUserId = '',
  initialCategory = '',
  initialFrom = '',
  initialTo = '',
}: LogActivityViewProps) {
  const router = useRouter()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function pushParams(overrides: Record<string, string | number> = {}) {
    const merged: Record<string, string> = {
      ...(pageSize !== DEFAULT_PAGE_SIZE && { pageSize: String(pageSize) }),
      ...(initialUserId && { userId: initialUserId }),
      ...(initialCategory && { category: initialCategory }),
      ...(initialFrom && { from: initialFrom }),
      ...(initialTo && { to: initialTo }),
    }
    for (const [k, v] of Object.entries(overrides)) {
      const s = String(v)
      if (s && !(k === 'page' && s === '1')) {
        merged[k] = s
      } else {
        delete merged[k]
      }
    }
    router.push(`/log-aktivitas?${new URLSearchParams(merged).toString()}`)
  }

  return (
    <>
      <LogFilterForm
        users={users}
        initialUserId={initialUserId}
        initialCategory={initialCategory}
        initialFrom={initialFrom}
        initialTo={initialTo}
        pageSize={pageSize}
      />

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
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
                  <span className="inline-block rounded-md px-2 py-0.5 text-xs font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {logs.length === 0 && (
          <div className="rounded-xl border border-border/60 bg-white shadow-sm py-12 text-center text-sm text-slate-400">
            Tidak ada log.
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl border border-border/60 bg-white shadow-sm p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-block rounded-md px-2 py-0.5 text-xs font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {log.action}
              </span>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {format(log.createdAt, 'dd MMM yyyy HH:mm', { locale: localeId })}
              </span>
            </div>
            <p className="text-sm text-slate-700">
              {log.user?.name ?? <span className="text-slate-400 italic">System</span>}
            </p>
            {log.information && (
              <p className="text-xs text-slate-500">{log.information}</p>
            )}
            {log.resourceId && (
              <p className="font-mono text-xs text-slate-400">ID: {log.resourceId.slice(-8)}</p>
            )}
          </div>
        ))}
      </div>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => pushParams({ page: p })}
        onPageSizeChange={(s) => pushParams({ pageSize: s, page: 1 })}
        label="entri"
      />
    </>
  )
}
