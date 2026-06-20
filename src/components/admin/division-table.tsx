'use client'

import { useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { getHexColor } from '@/lib/division-colors'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { deleteDivision } from '@/app/(app)/divisi/actions'

type Division = {
  id: string
  name: string
  color: string
  _count: { users: number; documentDivisions: number }
}

interface DivisionTableProps {
  divisions: Division[]
  onMutate: () => void
  onEdit: (division: { id: string; name: string; color: string }) => void
}

export function DivisionTable({ divisions, onMutate, onEdit }: DivisionTableProps) {
  const [isPending, startTransition] = useTransition()

  async function handleDelete(id: string) {
    if (!window.confirm('Hapus divisi ini?')) return
    const result = await deleteDivision(id)
    if (result.success) {
      startTransition(() => onMutate())
    } else {
      alert(result.error)
    }
  }

  if (divisions.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <p className="py-8 text-center text-sm text-muted-foreground">
          Belum ada divisi. Tambahkan divisi di atas.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Divisi</TableHead>
              <TableHead className="text-center">Pengguna</TableHead>
              <TableHead className="text-center">Dokumen</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisions.map((division) => {
              const hex = getHexColor(division.color)
              return (
                <TableRow key={division.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                      <span className="font-medium text-slate-800">{division.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-slate-600">{division._count.users}</TableCell>
                  <TableCell className="text-center text-slate-600">{division._count.documentDivisions}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => onEdit({ id: division.id, name: division.name, color: division.color })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(division.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {divisions.map((division) => {
          const hex = getHexColor(division.color)
          return (
            <div key={division.id} className="rounded-xl border border-border/60 bg-white shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                  <span className="font-medium text-slate-800">{division.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                  <span>{division._count.users} pengguna</span>
                  <span>{division._count.documentDivisions} dokumen</span>
                </div>
              </div>
              <div className="flex justify-end gap-1 pt-1 border-t border-border/40">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onEdit({ id: division.id, name: division.name, color: division.color })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(division.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
