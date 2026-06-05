'use client'

import { useState, useTransition } from 'react'
import { Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserForm } from './user-form'
import { toggleUserActive, updateUser } from '@/app/(admin)/admin/users/actions'

type Division = { id: string; name: string }

type User = {
  id: string
  name: string
  username: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  divisionId: string | null
  division: { id: string; name: string } | null
}

interface UserTableProps {
  users: User[]
  divisions: Division[]
  onMutate: () => void
}

export function UserTable({ users, divisions, onMutate }: UserTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleUpdate(
    id: string,
    values: { name: string; username: string; password: string; role: 'ADMIN' | 'USER'; divisionId: string | null },
  ) {
    const result = await updateUser(id, values)
    if (result.success) {
      setEditingId(null)
      startTransition(() => onMutate())
    } else {
      setError(result.error)
    }
  }

  async function handleToggle(id: string) {
    setError(null)
    const result = await toggleUserActive(id)
    if (result.success) {
      startTransition(() => onMutate())
    } else {
      setError(result.error)
    }
  }

  if (users.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada pengguna. Tambahkan pengguna di atas.
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
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Divisi</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              {editingId === user.id ? (
                <TableCell colSpan={6}>
                  <div className="py-2">
                    <UserForm
                      defaultValues={{
                        name: user.name,
                        username: user.username,
                        role: user.role,
                        divisionId: user.divisionId,
                      }}
                      onSubmit={(values) => handleUpdate(user.id, values)}
                      onCancel={() => { setEditingId(null); setError(null) }}
                      isSubmitting={isPending}
                      submitLabel="Simpan"
                      divisions={divisions}
                      isEditing
                    />
                  </div>
                </TableCell>
              ) : (
                <>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role === 'ADMIN' ? 'Admin' : 'Pengguna'}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.division?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.isActive ? 'default' : 'secondary'}
                      className={user.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                    >
                      {user.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setEditingId(user.id); setError(null) }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(user.id)}
                        disabled={isPending}
                      >
                        {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
