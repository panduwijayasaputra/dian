'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getDocumentViewUrl } from '@/app/(app)/documents/actions'
import { getDocument } from '@/lib/idb'

interface DocumentViewerModalProps {
  documentId: string | null
  isOpen: boolean
  onClose: () => void
  extractionStatus?: string
}

export function DocumentViewerModal({ documentId, isOpen, onClose, extractionStatus }: DocumentViewerModalProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isOpen || !documentId) {
      setUrl(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setUrl(null)
    setError(null)

    // Revoke any previously created object URL to avoid memory leaks
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    if (!navigator.onLine) {
      getDocument(documentId).then((local) => {
        if (local?.file_blob) {
          const objUrl = URL.createObjectURL(local.file_blob)
          objectUrlRef.current = objUrl
          setUrl(objUrl)
        } else {
          setError('Dokumen tidak tersedia secara offline.')
        }
        setIsLoading(false)
      })
      return
    }

    getDocumentViewUrl(documentId).then((result) => {
      if (result.success) {
        setUrl(result.url)
      } else {
        setError(result.error)
      }
      setIsLoading(false)
    })

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [isOpen, documentId])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-dvh w-screen max-w-none top-0 left-0 translate-x-0 translate-y-0 flex-col gap-0 p-0 rounded-none border-0 sm:max-w-none">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Lihat Dokumen</DialogTitle>
          {(extractionStatus === 'failed' || extractionStatus === 'manual_only') && (
            <p className="text-sm text-amber-600 mt-1">
              Kualitas ekstraksi teks rendah. Dokumen ini mungkin menggunakan font atau encoding yang tidak didukung. Harap periksa dan masukkan metadata secara manual.
            </p>
          )}
        </DialogHeader>

        <div className="flex flex-1 items-center justify-center overflow-hidden">
          {isLoading && (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {url && (
            <iframe
              src={url}
              className="h-full w-full"
              title="Document viewer"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
