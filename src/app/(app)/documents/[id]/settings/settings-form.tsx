'use client'

import { useState } from 'react'
import { updateDocumentMetadata } from '@/app/(app)/documents/actions'
import { MetadataForm, type MetadataFormValues } from '@/components/documents/metadata-form'

interface SettingsFormProps {
  documentId: string
  defaultValues: MetadataFormValues
}

export function SettingsForm({ documentId, defaultValues }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(values: MetadataFormValues) {
    setIsSubmitting(true)
    setSuccess(false)
    setError(null)
    const result = await updateDocumentMetadata(documentId, values)
    setIsSubmitting(false)
    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error)
    }
  }

  return (
    <div>
      <MetadataForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Simpan Perubahan"
      />
      {success && (
        <p className="mt-3 text-sm text-green-600">Metadata berhasil disimpan.</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
