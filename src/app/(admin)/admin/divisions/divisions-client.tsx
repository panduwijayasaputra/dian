'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DivisionForm } from '@/components/admin/division-form'
import { DivisionTable } from '@/components/admin/division-table'
import { createDivision, getDivisions } from './actions'

type Division = Awaited<ReturnType<typeof getDivisions>>[number]

interface DivisionsClientProps {
  initialDivisions: Division[]
}

export function DivisionsClient({ initialDivisions }: DivisionsClientProps) {
  const [divisions, setDivisions] = useState(initialDivisions)
  const [showCreate, setShowCreate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function refresh() {
    startTransition(() => router.refresh())
    getDivisions().then(setDivisions)
  }

  async function handleCreate(name: string) {
    setIsSubmitting(true)
    setError(null)
    const result = await createDivision(name)
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
        <h1 className="text-2xl font-bold">Divisi</h1>
        {!showCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Divisi
          </Button>
        )}
      </div>

      {showCreate && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-sm font-semibold">Tambah Divisi Baru</h2>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <DivisionForm
            onSubmit={handleCreate}
            onCancel={() => { setShowCreate(false); setError(null) }}
            isSubmitting={isSubmitting}
            submitLabel="Tambah"
          />
        </div>
      )}

      <DivisionTable divisions={divisions} onMutate={refresh} />
    </div>
  )
}
