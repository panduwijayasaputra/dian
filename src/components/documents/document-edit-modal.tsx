'use client'

import { useEffect, useState } from 'react'
import { Loader2, Wand2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MetadataForm, type MetadataFormValues } from './metadata-form'
import { updateDocumentMetadata, extractDocumentMetadata } from '@/app/(app)/documents/actions'
import type { ConfidenceLevel, ExtractionResult } from '@/lib/extract-metadata'

type Division = { id: string; name: string }

interface DocumentEditModalProps {
  documentId: string | null
  defaultValues: MetadataFormValues | null
  divisions?: Division[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type AiSuggestions = Partial<Record<keyof MetadataFormValues, { confidence: ConfidenceLevel }>>

function extractionToDefaults(result: ExtractionResult): MetadataFormValues {
  return {
    documentNumber: result.documentNumber.value ?? '',
    documentDate: result.documentDate.value ?? '',
    sender: result.sender.value ?? '',
    receiver: result.receiver.value ?? '',
    subject: result.subject.value ?? '',
    documentType: result.documentType.value ?? '',
    urgency: result.urgency.value ?? '',
    security: result.security.value ?? '',
    deadlineStart: result.deadlineStart.value ?? '',
    deadlineEnd: result.deadlineEnd.value ?? '',
    memo: result.memo.value ?? '',
    divisionIds: [],
  }
}

function extractionToSuggestions(result: ExtractionResult): AiSuggestions {
  const suggestions: AiSuggestions = {}
  const keys = ['documentNumber', 'documentDate', 'sender', 'receiver', 'subject', 'documentType', 'urgency', 'security', 'memo'] as const
  for (const key of keys) {
    if (result[key].value !== null) {
      suggestions[key] = { confidence: result[key].confidence }
    }
  }
  return suggestions
}

export function DocumentEditModal({
  documentId,
  defaultValues,
  divisions,
  open,
  onOpenChange,
  onSuccess,
}: DocumentEditModalProps) {
  const [formKey, setFormKey] = useState(0)
  const [currentDefaults, setCurrentDefaults] = useState<MetadataFormValues | null>(defaultValues)
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCurrentDefaults(defaultValues)
    setAiSuggestions({})
    setFormKey((k) => k + 1)
    setHasUnsavedChanges(false)
  }, [documentId])

  function handleOpenChange(open: boolean) {
    if (!open && hasUnsavedChanges) {
      if (!window.confirm('Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?')) return
    }
    onOpenChange(open)
  }

  async function handleReExtract() {
    if (!documentId) return
    setIsExtracting(true)
    setError(null)
    const result = await extractDocumentMetadata(documentId)
    setIsExtracting(false)
    if (result.success) {
      const newDefaults = extractionToDefaults(result.result)
      newDefaults.deadlineStart = currentDefaults?.deadlineStart ?? ''
      newDefaults.deadlineEnd = currentDefaults?.deadlineEnd ?? ''
      newDefaults.divisionIds = currentDefaults?.divisionIds ?? []
      setCurrentDefaults(newDefaults)
      setAiSuggestions(extractionToSuggestions(result.result))
      setFormKey((k) => k + 1)
      setHasUnsavedChanges(true)
    } else {
      setError(result.error)
    }
  }

  async function handleSubmit(values: MetadataFormValues) {
    if (!documentId) return
    setIsSubmitting(true)
    setError(null)
    const result = await updateDocumentMetadata(documentId, values)
    setIsSubmitting(false)
    if (result.success) {
      setHasUnsavedChanges(false)
      onOpenChange(false)
      onSuccess()
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Metadata</DialogTitle>
            {/* // TODO: Re-extract button with AI suggestions (disabled while extracting or submitting, shows loading state while extracting) */}
            {/* <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReExtract}
              disabled={isExtracting || isSubmitting || !documentId}
            >
              {isExtracting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {isExtracting ? 'Mengekstrak…' : 'Ekstrak Ulang'}
            </Button> */}
          </div>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {currentDefaults && (
          <MetadataForm
            key={formKey}
            defaultValues={currentDefaults}
            aiSuggestions={aiSuggestions}
            onSubmit={handleSubmit}
            onDirtyChange={setHasUnsavedChanges}
            isSubmitting={isSubmitting}
            disabled={isExtracting}
            submitLabel="Simpan Perubahan"
            divisions={divisions}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
