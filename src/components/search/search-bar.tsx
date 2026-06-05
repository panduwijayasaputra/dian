'use client'

import { Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SearchBarProps = {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  isLoading: boolean
  disabled?: boolean
}

export function SearchBar({ value, onChange, onSubmit, isLoading, disabled }: SearchBarProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cari dokumen... (contoh: surat dari Kementerian Keuangan)"
        disabled={disabled || isLoading}
        className="flex-1"
      />
      <Button type="submit" disabled={disabled || isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        <span className="ml-2">{isLoading ? 'Mencari...' : 'Cari'}</span>
      </Button>
    </form>
  )
}
