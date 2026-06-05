'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserForm } from '@/components/admin/user-form'
import { UserTable } from '@/components/admin/user-table'
import { createUser, getUsers } from './actions'

type Division = { id: string; name: string }
type User = Awaited<ReturnType<typeof getUsers>>[number]

interface UsersClientProps {
  initialUsers: User[]
  divisions: Division[]
}

export function UsersClient({ initialUsers, divisions }: UsersClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [showCreate, setShowCreate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function refresh() {
    startTransition(() => router.refresh())
    getUsers().then(setUsers)
  }

  async function handleCreate(values: {
    name: string
    username: string
    password: string
    role: 'ADMIN' | 'USER'
    divisionId: string | null
  }) {
    setIsSubmitting(true)
    setError(null)
    const result = await createUser(values)
    setIsSubmitting(false)
    if (result.success) {
      setShowCreate(false)
      refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pengguna</h1>
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pengguna
          </Button>
        )}
      </div>

      {showCreate && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-sm font-semibold">Tambah Pengguna Baru</h2>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <UserForm
            onSubmit={handleCreate}
            onCancel={() => { setShowCreate(false); setError(null) }}
            isSubmitting={isSubmitting}
            submitLabel="Tambah"
            divisions={divisions}
          />
        </div>
      )}

      <UserTable users={users} divisions={divisions} onMutate={refresh} />
    </div>
  )
}
