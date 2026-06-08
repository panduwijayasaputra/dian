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
        receiver: null,
        subject: null,
        urgency: null,
        security: null,
        deadline_start: null,
        deadline_end: null,
        memo: null,
        summary: null,
        extracted_text: null,
        extraction_status: 'pending',
        status: 'pending_sync',
        r2_key: null,
        file_blob: file,
        original_name: file.name,
        created_at: new Date().toISOString(),
        synced_at: null,
        division_ids: []
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
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 text-center transition-all duration-200',
          isUploading
            ? 'cursor-not-allowed opacity-60'
            : isDragOver
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/40 hover:bg-slate-50/60',
        ].join(' ')}
      >
        {uploadStatus === 'uploading' && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Mengunggah…</p>
              <p className="mt-0.5 text-xs text-slate-500">{currentFileName}</p>
            </div>
          </>
        )}

        {uploadStatus === 'success' && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <div>
              {isOfflineQueue ? (
                <>
                  <p className="text-sm font-semibold text-slate-800">Tersimpan secara lokal</p>
                  <p className="mt-0.5 text-xs text-slate-500">Akan diunggah saat kembali online</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-800">Berhasil diunggah</p>
                  <p className="mt-0.5 text-xs text-slate-500">Mengalihkan ke tinjau metadata…</p>
                </>
              )}
            </div>
          </>
        )}

        {(uploadStatus === 'idle' || uploadStatus === 'error') && (
          <>
            <div className={[
              'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
              isDragOver ? 'bg-primary/10' : 'bg-slate-100',
            ].join(' ')}>
              <UploadCloud className={[
                'h-7 w-7 transition-colors',
                isDragOver ? 'text-primary' : 'text-slate-400',
              ].join(' ')} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {isDragOver ? 'Lepaskan file di sini' : 'Seret file PDF ke sini'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">PDF saja · maks. 20 MB per file</p>
            </div>
            <Button
              type="button"
              size="lg"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              Pilih File
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="flex-1 text-sm text-destructive">{error}</p>
          {failedFile && (
            <Button type="button" variant="outline" size="sm" onClick={retryUpload}>
              Coba lagi
            </Button>
          )}
        </div>
      )}

      {/* Queue */}
      {pendingQueue.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Antrean</p>
          <ul className="space-y-1.5">
            {pendingQueue.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-white px-3 py-2.5 text-sm shadow-sm"
              >
                <span className="truncate text-slate-700">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFromQueue(isUploading ? i + 1 : i)}
                  className="ml-2 shrink-0 text-slate-400 hover:text-destructive transition-colors"
                  aria-label="Hapus dari antrean"
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
