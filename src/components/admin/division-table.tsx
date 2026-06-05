'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DivisionForm } from './division-form'
import { deleteDivision, updateDivision } from '@/app/(admin)/admin/divisions/actions'

type Division = {
  id: string
  name: string
  _count: { users: number; documentDivisions: number }
}

interface DivisionTableProps {
  divisions: Division[]
  onMutate: () => void
}

export function DivisionTable({ divisions, onMutate }: DivisionTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEdit(id: string) {
    setEditingId(id)
    setError(null)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setError(null)
  }

  async function handleUpdate(id: string, name: string) {
    const result = await updateDivision(id, name)
    if (result.success) {
      setEditingId(null)
      startTransition(() => onMutate())
    } else {
      setError(result.error)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    const result = await deleteDivision(id)
    if (result.success) {
      startTransition(() => onMutate())
    } else {
      setError(result.error)
    }
  }

  if (divisions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada divisi. Tambahkan divisi di atas.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead className="text-center">Pengguna</TableHead>
            <TableHead className="text-center">Dokumen</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {divisions.map((division) => (
            <TableRow key={division.id}>
              <TableCell>
                {editingId === division.id ? (
                  <DivisionForm
                    defaultValues={{ name: division.name }}
                    onSubmit={(name) => handleUpdate(division.id, name)}
                    onCancel={handleCancelEdit}
                    isSubmitting={isPending}
                    submitLabel="Simpan"
                  />
                ) : (
                  division.name
                )}
              </TableCell>
              <TableCell className="text-center">{division._count.users}</TableCell>
              <TableCell className="text-center">{division._count.documentDivisions}</TableCell>
              <TableCell className="text-right">
                {editingId !== division.id && (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(division.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(division.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
