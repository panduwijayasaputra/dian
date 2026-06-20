'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const CATEGORIES: { value: string; label: string }[] = [
  { value: 'AUTH', label: 'Autentikasi' },
  { value: 'DOCUMENT', label: 'Dokumen' },
  { value: 'USER', label: 'Pengguna' },
  { value: 'DIVISION', label: 'Divisi' },
]

const DEFAULT_PAGE_SIZE = 50

interface LogFilterFormProps {
  users: { id: string; name: string }[]
  initialUserId?: string
  initialCategory?: string
  initialFrom?: string
  initialTo?: string
  pageSize?: number
}

export function LogFilterForm({
  users,
  initialUserId = '',
  initialCategory = '',
  initialFrom = '',
  initialTo = '',
  pageSize = DEFAULT_PAGE_SIZE,
}: LogFilterFormProps) {
  const router = useRouter()
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)

  useEffect(() => { setFrom(initialFrom) }, [initialFrom])
  useEffect(() => { setTo(initialTo) }, [initialTo])

  const hasActiveFilters = !!(initialUserId || initialCategory || from || to)

  function pushParams(overrides: Record<string, string> = {}) {
    const merged: Record<string, string> = {
      ...(pageSize !== DEFAULT_PAGE_SIZE && { pageSize: String(pageSize) }),
      ...(initialUserId && { userId: initialUserId }),
      ...(initialCategory && { category: initialCategory }),
      ...(from && { from }),
      ...(to && { to }),
      ...overrides,
    }
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    router.push(`/log-aktivitas?${p.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select value={initialUserId} onValueChange={(v) => pushParams({ userId: v ?? '' })}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Semua Pengguna" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Semua Pengguna</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={initialCategory} onValueChange={(v) => pushParams({ category: v ?? '' })}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Semua Kategori" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Semua Kategori</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        onBlur={() => pushParams()}
        className="w-36"
      />

      <Input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        onBlur={() => pushParams()}
        className="w-36"
      />

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFrom('')
            setTo('')
            router.push('/log-aktivitas')
          }}
          className="gap-1.5 text-slate-500"
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  )
}
