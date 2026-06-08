'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DivisionForm } from './division-form'

type DivisionModalMode =
  | { mode: 'create' }
  | { mode: 'edit'; id: string; name: string; color: string }

interface DivisionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: DivisionModalMode
  onSubmit: (id: string | null, name: string, color: string) => Promise<void>
  isSubmitting: boolean
  error?: string | null
}

export function DivisionModal({
  open,
  onOpenChange,
  mode,
  onSubmit,
  isSubmitting,
  error,
}: DivisionModalProps) {
  const isEdit = mode.mode === 'edit'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Divisi' : 'Tambah Divisi'}</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DivisionForm
          defaultValues={isEdit ? { name: mode.name, color: mode.color } : undefined}
          onSubmit={(name, color) => onSubmit(isEdit ? mode.id : null, name, color)}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
          submitLabel={isEdit ? 'Simpan' : 'Tambah'}
        />
      </DialogContent>
    </Dialog>
  )
}
