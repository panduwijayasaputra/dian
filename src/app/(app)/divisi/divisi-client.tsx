'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DivisionTable } from '@/components/admin/division-table'
import { DivisionModal } from '@/components/admin/division-modal'
import { createDivision, updateDivision, getDivisions } from './actions'

type Division = Awaited<ReturnType<typeof getDivisions>>[number]

type ModalState =
  | { open: false }
  | { open: true; mode: { mode: 'create' } }
  | { open: true; mode: { mode: 'edit'; id: string; name: string; color: string } }

export function DivisiClient({ initialDivisions }: { initialDivisions: Division[] }) {
  const [divisions, setDivisions] = useState(initialDivisions)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function refresh() {
    startTransition(() => router.refresh())
    getDivisions().then(setDivisions)
  }

  function openCreate() {
    setError(null)
    setModal({ open: true, mode: { mode: 'create' } })
  }

  function openEdit(division: { id: string; name: string; color: string }) {
    setError(null)
    setModal({ open: true, mode: { mode: 'edit', ...division } })
  }

  function closeModal() {
    setModal({ open: false })
    setError(null)
  }

  async function handleSubmit(id: string | null, name: string, color: string) {
    setIsSubmitting(true)
    setError(null)
    const result = id
      ? await updateDivision(id, name, color)
      : await createDivision(name, color)
    setIsSubmitting(false)
    if (result.success) {
      closeModal()
      refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Divisi</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola divisi organisasi</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Divisi
        </Button>
      </div>

      <DivisionTable divisions={divisions} onMutate={refresh} onEdit={openEdit} />

      {modal.open && (
        <DivisionModal
          open={modal.open}
          onOpenChange={(open) => { if (!open) closeModal() }}
          mode={modal.mode}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
    </div>
  )
}
