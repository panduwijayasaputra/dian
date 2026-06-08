'use client'

import { useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toggleUserActive } from '@/app/(app)/pengguna/actions'

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
  onEdit: (user: { id: string; name: string; username: string; role: 'ADMIN' | 'USER'; divisionId: string | null }) => void
}

export function UserTable({ users, divisions: _divisions, onMutate, onEdit }: UserTableProps) {
  const [isPending, startTransition] = useTransition()

  async function handleToggle(id: string) {
    const result = await toggleUserActive(id)
    if (result.success) {
      startTransition(() => onMutate())
    } else {
      alert(result.error)
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
    <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
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
              <TableCell className="font-medium text-slate-800">{user.name}</TableCell>
              <TableCell className="text-slate-500">{user.username}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                  {user.role === 'ADMIN' ? 'Admin' : 'Pengguna'}
                </Badge>
              </TableCell>
              <TableCell className="text-slate-600">{user.division?.name ?? '—'}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    user.isActive
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }
                >
                  {user.isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() =>
                      onEdit({
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        role: user.role,
                        divisionId: user.divisionId,
                      })
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" />
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
