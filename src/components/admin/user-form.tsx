'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Division = { id: string; name: string }

interface UserFormValues {
  name: string
  username: string
  password: string
  role: 'ADMIN' | 'USER'
  divisionId: string | null
}

interface UserFormProps {
  defaultValues?: Partial<Omit<UserFormValues, 'password'>>
  onSubmit: (values: UserFormValues) => Promise<void>
  onCancel?: () => void
  isSubmitting: boolean
  submitLabel: string
  divisions: Division[]
  isEditing?: boolean
}

export function UserForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
  divisions,
  isEditing = false,
}: UserFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [username, setUsername] = useState(defaultValues?.username ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'USER'>(defaultValues?.role ?? 'USER')
  const [divisionId, setDivisionId] = useState<string | null>(defaultValues?.divisionId ?? null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit({ name, username, password, role, divisionId })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-name">Nama</Label>
        <Input
          id="user-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama lengkap"
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-username">Username</Label>
        <Input
          id="user-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username untuk login"
          disabled={isSubmitting}
          required
        />
      </div>

      {!isEditing && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="user-password">Password</Label>
          <Input
            id="user-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            disabled={isSubmitting}
            required
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="user-role">Role</Label>
        <Select
          value={role}
          onValueChange={(val) => {
            const newRole = (val ?? 'USER') as 'ADMIN' | 'USER'
            setRole(newRole)
            if (newRole === 'ADMIN') setDivisionId(null)
          }}
        >
          <SelectTrigger id="user-role" className="w-full">
            <SelectValue placeholder="Pilih role">
              {role === 'ADMIN' ? 'Admin' : 'Pengguna'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="USER">Pengguna</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {role === 'USER' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="user-division">Divisi</Label>
          <Select
            value={divisionId ?? ''}
            onValueChange={(val) => setDivisionId(val || null)}
          >
            <SelectTrigger id="user-division" className="w-full">
              <SelectValue placeholder="Pilih divisi">
                {divisions.find((d) => d.id === divisionId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {divisions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Batal
          </Button>
        )}
      </div>
    </form>
  )
}
