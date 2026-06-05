'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadDocument } from '@/app/(app)/upload/actions'
import { upsertDocument } from '@/lib/idb'

const MAX_SIZE_BYTES = 20 * 1024 * 1024

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface DropZoneProps {
  onUploadComplete?: (documentId: string) => void
}

export function DropZone({ onUploadComplete }: DropZoneProps = {}) {
  const router = useRouter()
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queue, setQueue] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [currentFileName, setCurrentFileName] = useState<string | null>(null)
  const [failedFile, setFailedFile] = useState<File | null>(null)
  const [isOfflineQueue, setIsOfflineQueue] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isUploading || queue.length === 0) return

    const file = queue[0]
    setIsUploading(true)
    setUploadStatus('uploading')
    setCurrentFileName(file.name)
    setError(null)
    setFailedFile(null)

    if (!navigator.onLine) {
      const localId = crypto.randomUUID()
      upsertDocument({
        id: localId,
        document_number: null,
        document_date: null,
        sender: null,
        subject: null,
        summary: null,
        extracted_text: null,
        status: 'pending_sync',
        r2_key: null,
        file_blob: file,
        original_name: file.name,
        created_at: new Date().toISOString(),
        synced_at: null,
      }).then(() => {
        setIsOfflineQueue(true)
        setUploadStatus('success')
        setQueue((prev) => prev.slice(1))
        setIsUploading(false)
        setTimeout(() => {
          setUploadStatus('idle')
          setCurrentFileName(null)
          setIsOfflineQueue(false)
          if (onUploadComplete) {
            onUploadComplete(localId)
          } else {
            router.push('/documents')
          }
        }, 1800)
      })
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    uploadDocument(formData).then((result) => {
      if (result.success) {
        setUploadStatus('success')
        setQueue((prev) => prev.slice(1))
        setIsUploading(false)
        if (onUploadComplete) {
          setTimeout(() => {
            setUploadStatus('idle')
            setCurrentFileName(null)
            onUploadComplete(result.documentId)
          }, 800)
        } else {
          setTimeout(() => {
            setUploadStatus('idle')
            setCurrentFileName(null)
            router.push('/documents')
          }, 1500)
        }
      } else {
        setUploadStatus('error')
        setError(result.error)
        setFailedFile(file)
        setQueue((prev) => prev.slice(1))
        setIsUploading(false)
      }
    })
  }, [queue, isUploading, router])

  function handleFile(file: File) {
    setError(null)
    setFailedFile(null)
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('File exceeds the 20 MB limit.')
      return
    }
    setQueue((prev) => [...prev, file])
  }

  function retryUpload() {
    if (!failedFile) return
    setError(null)
    setUploadStatus('idle')
    setQueue((prev) => [failedFile, ...prev])
    setFailedFile(null)
  }

  function removeFromQueue(index: number) {
    setQueue((prev) => prev.filter((_, i) => i !== index))
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (!isUploading) setIsDragOver(true)
  }

  function onDragLeave() {
    setIsDragOver(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (isUploading) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const pendingQueue = isUploading ? queue.slice(1) : queue

  return (
    <div className="space-y-4">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors',
          isUploading
            ? 'cursor-not-allowed opacity-60'
            : isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        ].join(' ')}
      >
        {uploadStatus === 'uploading' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Uploading {currentFileName}…</p>
          </>
        )}

        {uploadStatus === 'success' && (
          <>
            <CheckCircle className="h-10 w-10 text-green-500" />
            {isOfflineQueue ? (
              <p className="text-sm font-medium text-green-600">
                Disimpan secara lokal. Akan diunggah saat Anda kembali online.
              </p>
            ) : (
              <p className="text-sm font-medium text-green-600">Uploaded successfully</p>
            )}
          </>
        )}

        {(uploadStatus === 'idle' || uploadStatus === 'error') && (
          <>
            <UploadCloud
              className={[
                'h-10 w-10 transition-colors',
                isDragOver ? 'text-primary' : 'text-muted-foreground',
              ].join(' ')}
            />
            <div>
              <p className="text-sm font-medium">Drag a PDF here</p>
              <p className="mt-1 text-xs text-muted-foreground">PDF only · max 20 MB</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              Browse files
            </Button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          disabled={isUploading}
          onChange={onInputChange}
        />
      </div>

      {error && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-destructive">{error}</p>
          {failedFile && (
            <Button type="button" variant="outline" size="sm" onClick={retryUpload}>
              Retry
            </Button>
          )}
        </div>
      )}

      {pendingQueue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Next up</p>
          <ul className="space-y-1">
            {pendingQueue.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFromQueue(isUploading ? i + 1 : i)}
                  className="ml-2 text-muted-foreground hover:text-destructive"
                  aria-label="Remove from queue"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
