'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  extractDocumentMetadata,
  saveDocumentMetadata,
  deleteDocument,
  getDocumentViewUrl,
  type DuplicateInfo,
} from '@/app/(app)/documents/actions'
import { upsertDocument, deleteDocument as idbDeleteDocument } from '@/lib/idb'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ExtractionResult } from '@/lib/extract-document'
import { MetadataForm, type MetadataFormValues } from './metadata-form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Division = { id: string; name: string }

interface MetadataReviewSheetProps {
  open: boolean
  documentId: string | null
  onClose: () => void
  divisions?: Division[]
  isLocal?: boolean
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

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  INCOMING_LETTER: 'Surat Masuk',
  OUTGOING_LETTER: 'Surat Keluar',
  SPT: 'SPT',
  NOTA_DINAS: 'Nota Dinas',
  OTHER: 'Lainnya',
}

const URGENCY_LABEL: Record<string, string> = {
  BIASA: 'Biasa',
  SEGERA: 'Segera',
  SANGAT_SEGERA: 'Sangat Segera',
}

const EMPTY_EXTRACTION: ExtractionResult = {
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
}

export function MetadataReviewSheet({ open, documentId, onClose, divisions, isLocal }: MetadataReviewSheetProps) {
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

    if (isLocal) {
      setExtraction(EMPTY_EXTRACTION)
      return
    }

    setIsExtracting(true)
    extractDocumentMetadata(documentId).then((result) => {
      setIsExtracting(false)
      if (result.success) {
        setExtraction(result.result)
        setIsManualOnly(result.document.extractionStatus === 'manual_only')
      } else {
        setExtraction(EMPTY_EXTRACTION)
      }
    })
  }, [open, documentId, isLocal])

  async function handleSave(values: MetadataFormValues, force = false) {
    if (!documentId) return
    setIsSubmitting(true)
    setError(null)

    if (isLocal) {
      await upsertDocument({
        id: documentId,
        document_number: values.documentNumber || null,
        document_date: values.documentDate || null,
        sender: values.sender || null,
        receiver: values.receiver || null,
        subject: values.subject || null,
        urgency: values.urgency || null,
        security: values.security || null,
        deadline_start: values.deadlineStart || null,
        deadline_end: values.deadlineEnd || null,
        memo: values.memo || null,
        summary: null,
        extracted_text: null,
        extraction_status: 'pending',
        status: 'pending_sync',
        r2_key: null,
        file_blob: null,
        original_name: null,
        created_at: new Date().toISOString(),
        synced_at: null,
        division_ids: values.divisionIds ?? [],
      })
      setIsSubmitting(false)
      onClose()
      return
    }

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
    if (isLocal) {
      await idbDeleteDocument(documentId)
    } else {
      await deleteDocument(documentId)
    }
    onClose()
  }

  async function handleViewDocument(id: string) {
    const result = await getDocumentViewUrl(id)
    if (result.success) window.open(result.url, '_blank')
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nomor dokumen sudah ada</DialogTitle>
            <DialogDescription>
              Dokumen lama beserta filenya akan dihapus dan diganti. Periksa perbedaannya sebelum melanjutkan.
            </DialogDescription>
          </DialogHeader>
          {duplicate && (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Field</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Dokumen Lama
                        <button
                          type="button"
                          onClick={() => handleViewDocument(duplicate.info.id)}
                          className="text-xs font-normal text-primary underline underline-offset-2 hover:no-underline"
                        >
                          Lihat
                        </button>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        Dokumen Baru
                        {documentId && (
                          <button
                            type="button"
                            onClick={() => handleViewDocument(documentId)}
                            className="text-xs font-normal text-primary underline underline-offset-2 hover:no-underline"
                          >
                            Lihat
                          </button>
                        )}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {([
                    ['Nomor', duplicate.info.documentNumber, duplicate.pendingValues.documentNumber],
                    ['Tanggal', duplicate.info.documentDate, duplicate.pendingValues.documentDate],
                    ['Pengirim', duplicate.info.sender, duplicate.pendingValues.sender],
                    ['Penerima', duplicate.info.receiver, duplicate.pendingValues.receiver],
                    ['Perihal', duplicate.info.subject, duplicate.pendingValues.subject],
                    ['Jenis', duplicate.info.documentType ? (DOCUMENT_TYPE_LABEL[duplicate.info.documentType] ?? duplicate.info.documentType) : null, duplicate.pendingValues.documentType ? (DOCUMENT_TYPE_LABEL[duplicate.pendingValues.documentType] ?? duplicate.pendingValues.documentType) : null],
                    ['Sifat', duplicate.info.urgency ? (URGENCY_LABEL[duplicate.info.urgency] ?? duplicate.info.urgency) : null, duplicate.pendingValues.urgency ? (URGENCY_LABEL[duplicate.pendingValues.urgency] ?? duplicate.pendingValues.urgency) : null],
                  ] as [string, string | null | undefined, string | null | undefined][]).map(([label, oldVal, newVal]) => {
                    const differs = (oldVal || '') !== (newVal || '')
                    return (
                      <TableRow key={label} className={differs ? 'bg-amber-50 hover:bg-amber-100/60' : ''}>
                        <TableCell className="text-muted-foreground">{label}</TableCell>
                        <TableCell className={differs ? 'text-destructive line-through' : ''}>{oldVal || <span className="text-muted-foreground/50">—</span>}</TableCell>
                        <TableCell className={differs ? 'font-medium' : ''}>{newVal || <span className="text-muted-foreground/50">—</span>}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicate(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleForceSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ganti Dokumen'}
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
