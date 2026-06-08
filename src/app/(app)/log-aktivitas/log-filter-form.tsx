'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
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

interface LogFilterFormProps {
  users: { id: string; name: string }[]
  initialUserId?: string
  initialCategory?: string
  initialFrom?: string
  initialTo?: string
}

export function LogFilterForm({
  users,
  initialUserId = '',
  initialCategory = '',
  initialFrom = '',
  initialTo = '',
}: LogFilterFormProps) {
  const router = useRouter()
  const [userId, setUserId] = useState(initialUserId)
  const [category, setCategory] = useState(initialCategory)
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams()
    if (userId) p.set('userId', userId)
    if (category) p.set('category', category)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    router.push(`/log-aktivitas?${p.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Pengguna</label>
        <Select value={userId} onValueChange={(v) => setUserId(v ?? '')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Pengguna">
              {users.find((u) => u.id === userId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Pengguna</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Kategori</label>
        <Select value={category} onValueChange={(v) => setCategory(v ?? '')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua Kategori">
              {CATEGORIES.find((c) => c.value === category)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Kategori</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Dari</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 rounded-lg border border-input bg-muted/40 px-3 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">Sampai</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 rounded-lg border border-input bg-muted/40 px-3 text-sm"
        />
      </div>

      <button
        type="submit"
        className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white"
      >
        Filter
      </button>
      <a
        href="/log-aktivitas"
        className="h-9 rounded-lg border px-4 text-sm font-medium flex items-center"
      >
        Reset
      </a>
    </form>
  )
}
