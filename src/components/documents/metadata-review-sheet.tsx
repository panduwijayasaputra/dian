'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  extractDocumentMetadata,
  saveDocumentMetadata,
  deleteDocument,
  type DuplicateInfo,
} from '@/app/(app)/documents/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
    receiver: result.receiver.value ?? '',
    subject: result.subject.value ?? '',
    documentType: result.documentType.value ?? '',
    urgency: result.urgency.value ?? '',
    security: result.security.value ?? '',
    deadlineStart: result.deadlineStart.value ?? '',
    deadlineEnd: result.deadlineEnd.value ?? '',
    memo: result.memo.value ?? '',
  }
}

function extractionToSuggestions(result: ExtractionResult) {
  type Suggestions = Parameters<typeof MetadataForm>[0]['aiSuggestions']
  const suggestions: Suggestions = {}
  const keys = ['documentNumber', 'documentDate', 'sender', 'receiver', 'subject', 'documentType', 'urgency', 'security', 'deadlineStart', 'deadlineEnd', 'memo'] as const
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
  const [isManualOnly, setIsManualOnly] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [duplicate, setDuplicate] = useState<{ info: DuplicateInfo; pendingValues: MetadataFormValues } | null>(null)

  useEffect(() => {
    if (!open || !documentId) return
    setExtraction(null)
    setIsManualOnly(false)
    setError(null)
    setIsExtracting(true)

    extractDocumentMetadata(documentId).then((result) => {
      setIsExtracting(false)
      if (result.success) {
        setExtraction(result.result)
        setIsManualOnly(result.document.extractionStatus === 'manual_only')
      } else {
        setExtraction({
          documentNumber: { value: null, confidence: 'low' },
          documentDate: { value: null, confidence: 'low' },
          sender: { value: null, confidence: 'low' },
          receiver: { value: null, confidence: 'low' },
          subject: { value: null, confidence: 'low' },
          documentType: { value: null, confidence: 'low' },
          urgency: { value: null, confidence: 'low' },
          security: { value: null, confidence: 'low' },
          deadlineStart: { value: null, confidence: 'low' },
          deadlineEnd: { value: null, confidence: 'low' },
          memo: { value: null, confidence: 'low' },
        })
      }
    })
  }, [open, documentId])

  async function handleSave(values: MetadataFormValues, force = false) {
    if (!documentId) return
    setIsSubmitting(true)
    setError(null)
    const result = await saveDocumentMetadata(documentId, values, force)
    setIsSubmitting(false)
    if (result.success) {
      onClose()
    } else if ('duplicate' in result) {
      setDuplicate({ info: result.duplicate, pendingValues: values })
    } else {
      setError(result.error)
    }
  }

  async function handleConfirmedDiscard() {
    if (!documentId) return
    setShowDiscardConfirm(false)
    await deleteDocument(documentId)
    onClose()
  }

  async function handleForceSave() {
    if (!duplicate) return
    setDuplicate(null)
    await handleSave(duplicate.pendingValues, true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) setShowDiscardConfirm(true) }}>
        <DialogContent showCloseButton={!isExtracting} className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tinjau Metadata Dokumen</DialogTitle>
          </DialogHeader>

          {isExtracting && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Mengekstrak metadata…</p>
            </div>
          )}

          {!isExtracting && extraction && (
            <>
              {isManualOnly && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  <p className="font-medium">Teks tidak terbaca otomatis</p>
                  <p className="mt-0.5 text-xs text-amber-700">Dokumen ini tidak dapat diekstrak secara otomatis. Periksa dan isi metadata secara manual.</p>
                </div>
              )}
              <MetadataForm
                defaultValues={extractionToDefaults(extraction)}
                aiSuggestions={extractionToSuggestions(extraction)}
                onSubmit={(values) => handleSave(values)}
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
                  onClick={() => setShowDiscardConfirm(true)}
                  disabled={isSubmitting}
                >
                  Batal — Hapus Dokumen
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!duplicate} onOpenChange={(o) => { if (!o) setDuplicate(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nomor dokumen sudah ada</DialogTitle>
            <DialogDescription className="space-y-2 text-sm">
              Dokumen dengan nomor <span className="font-medium text-foreground">{duplicate?.info.documentNumber}</span> sudah tersimpan
              {(duplicate?.info.sender || duplicate?.info.documentDate) && (
                <span className="block rounded-md border px-3 py-2 text-xs text-muted-foreground mt-1.5 space-y-0.5">
                  {duplicate?.info.sender && <span className="block">Pengirim: {duplicate.info.sender}</span>}
                  {duplicate?.info.documentDate && <span className="block">Tanggal: {duplicate.info.documentDate}</span>}
                </span>
              )}
              {'. Tetap simpan dokumen baru ini?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicate(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleForceSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tetap Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan unggahan?</DialogTitle>
            <DialogDescription>
              Dokumen akan dihapus secara permanen dan tidak dapat dipulihkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscardConfirm(false)}>
              Lanjutkan Edit
            </Button>
            <Button variant="destructive" onClick={handleConfirmedDiscard}>
              Ya, Hapus Dokumen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
