'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DivisionFormProps {
  defaultValues?: { name: string }
  onSubmit: (name: string) => Promise<void>
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(name)
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
      <div className="flex gap-2">
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
