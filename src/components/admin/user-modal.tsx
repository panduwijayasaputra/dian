'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserForm } from './user-form'

type Division = { id: string; name: string }

type UserModalValues = {
  name: string
  username: string
  password: string
  role: 'ADMIN' | 'USER'
  divisionId: string | null
}

type UserModalMode =
  | { mode: 'create' }
  | { mode: 'edit'; id: string; name: string; username: string; role: 'ADMIN' | 'USER'; divisionId: string | null }

interface UserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: UserModalMode
  divisions: Division[]
  onSubmit: (id: string | null, values: UserModalValues) => Promise<void>
  isSubmitting: boolean
  error?: string | null
}

export function UserModal({
  open,
  onOpenChange,
  mode,
  divisions,
  onSubmit,
  isSubmitting,
  error,
}: UserModalProps) {
  const isEdit = mode.mode === 'edit'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'}</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <UserForm
          defaultValues={
            isEdit
              ? { name: mode.name, username: mode.username, role: mode.role, divisionId: mode.divisionId }
              : undefined
          }
          onSubmit={(values) => onSubmit(isEdit ? mode.id : null, values)}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
          submitLabel={isEdit ? 'Simpan' : 'Tambah'}
          divisions={divisions}
          isEditing={isEdit}
        />
      </DialogContent>
    </Dialog>
  )
}
