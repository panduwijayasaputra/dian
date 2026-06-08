'use client'

import { useState } from 'react'
import { getHexColor, DEFAULT_DIVISION_COLOR } from '@/lib/division-colors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DivisionFormProps {
  defaultValues?: { name: string; color?: string }
  onSubmit: (name: string, color: string) => Promise<void>
  onCancel?: () => void
  isSubmitting: boolean
  submitLabel: string
}

export function DivisionForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: DivisionFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [color, setColor] = useState(getHexColor(defaultValues?.color ?? DEFAULT_DIVISION_COLOR))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(name, color)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="division-name">Nama Divisi</Label>
        <Input
          id="division-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Contoh: Sekretariat"
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="division-color">Warna</Label>
        <div className="flex items-center gap-3">
          <input
            id="division-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={isSubmitting}
            className="h-9 w-14 cursor-pointer rounded-lg border border-input bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="font-mono text-sm text-slate-500">{color}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
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
