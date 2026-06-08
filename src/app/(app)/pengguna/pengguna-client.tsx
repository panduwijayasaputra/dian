'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserTable } from '@/components/admin/user-table'
import { UserModal } from '@/components/admin/user-modal'
import { createUser, updateUser, getUsers } from './actions'

type Division = { id: string; name: string }
type User = Awaited<ReturnType<typeof getUsers>>[number]

type UserValues = {
  name: string
  username: string
  password: string
  role: 'ADMIN' | 'USER'
  divisionId: string | null
}

type ModalState =
  | { open: false }
  | { open: true; mode: { mode: 'create' } }
  | { open: true; mode: { mode: 'edit'; id: string; name: string; username: string; role: 'ADMIN' | 'USER'; divisionId: string | null } }

export function PenggunaClient({ initialUsers, divisions }: { initialUsers: User[]; divisions: Division[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [modal, setModal] = useState<ModalState>({ open: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  function refresh() {
    startTransition(() => router.refresh())
    getUsers().then(setUsers)
  }

  function openCreate() {
    setError(null)
    setModal({ open: true, mode: { mode: 'create' } })
  }

  function openEdit(user: { id: string; name: string; username: string; role: 'ADMIN' | 'USER'; divisionId: string | null }) {
    setError(null)
    setModal({ open: true, mode: { mode: 'edit', ...user } })
  }

  function closeModal() {
    setModal({ open: false })
    setError(null)
  }

  async function handleSubmit(id: string | null, values: UserValues) {
    setIsSubmitting(true)
    setError(null)
    const result = id
      ? await updateUser(id, values)
      : await createUser(values)
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pengguna</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola akun pengguna sistem</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>

      <UserTable users={users} divisions={divisions} onMutate={refresh} onEdit={openEdit} />

      {modal.open && (
        <UserModal
          open={modal.open}
          onOpenChange={(open) => { if (!open) closeModal() }}
          mode={modal.mode}
          divisions={divisions}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
    </div>
  )
}
