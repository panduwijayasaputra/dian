'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  extractDocumentMetadata,
  saveDocumentMetadata,
  deleteDocument,
} from '@/app/(app)/documents/actions'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { ExtractionResult } from '@/lib/extract-metadata'
import { MetadataForm, type MetadataFormValues } from './metadata-form'

type Division = { id: string; name: string }

interface MetadataReviewSheetProps {
  open: boolean
  documentId: string | null
  onClose: () => void
  divisions?: Division[]
}

function extractionToDefaults(result: ExtractionResult): Partial<MetadataFormValues> {
  return {
    documentNumber: result.documentNumber.value ?? '',
    documentDate: result.documentDate.value ?? '',
    sender: result.sender.value ?? '',
    subject: result.subject.value ?? '',
    documentType: result.documentType.value ?? '',
  }
}

function extractionToSuggestions(result: ExtractionResult) {
  type Suggestions = Parameters<typeof MetadataForm>[0]['aiSuggestions']
  const suggestions: Suggestions = {}
  const keys = ['documentNumber', 'documentDate', 'sender', 'subject', 'documentType'] as const
  for (const key of keys) {
    if (result[key].value !== null) {
      suggestions[key] = { confidence: result[key].confidence }
    }
  }
  return suggestions
}

export function MetadataReviewSheet({ open, documentId, onClose, divisions }: MetadataReviewSheetProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !documentId) return
    setExtraction(null)
    setError(null)
    setIsExtracting(true)

    extractDocumentMetadata(documentId).then((result) => {
      setIsExtracting(false)
      if (result.success) {
        setExtraction(result.result)
      } else {
        setExtraction({
          documentNumber: { value: null, confidence: 'low' },
          documentDate: { value: null, confidence: 'low' },
          sender: { value: null, confidence: 'low' },
          subject: { value: null, confidence: 'low' },
          documentType: { value: null, confidence: 'low' },
        })
      }
    })
  }, [open, documentId])

  async function handleSave(values: MetadataFormValues) {
    if (!documentId) return
    setIsSubmitting(true)
    setError(null)
    const result = await saveDocumentMetadata(documentId, values)
    setIsSubmitting(false)
    if (result.success) {
      onClose()
    } else {
      setError(result.error)
    }
  }

  async function handleCancel() {
    if (!documentId) return
    const confirmed = window.confirm('Batalkan unggahan? Dokumen akan dihapus.')
    if (!confirmed) return
    await deleteDocument(documentId)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="mb-6">
          <SheetTitle>Tinjau Metadata Dokumen</SheetTitle>
        </SheetHeader>

        {isExtracting && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Mengekstrak metadata…</p>
          </div>
        )}

        {!isExtracting && extraction && (
          <>
            <MetadataForm
              defaultValues={extractionToDefaults(extraction)}
              aiSuggestions={extractionToSuggestions(extraction)}
              onSubmit={handleSave}
              isSubmitting={isSubmitting}
              submitLabel="Simpan Dokumen"
              divisions={divisions}
            />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-4 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Batal — Hapus Dokumen
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
