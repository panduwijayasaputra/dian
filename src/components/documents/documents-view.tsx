'use client'

import { useState, useTransition, useMemo, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Upload, Search, X, WifiOff } from 'lucide-react'
import type { DocumentStatus, DocumentType } from '@/generated/prisma/enums'
import { buttonVariants, Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DocumentsTable } from './documents-table'
import { DocumentViewerModal } from './document-viewer-modal'
import { DocumentEditModal } from './document-edit-modal'
import { PaginationControls } from '@/components/ui/pagination-controls'
import type { MetadataFormValues } from './metadata-form'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { listDocuments, type LocalDocument } from '@/lib/idb'

const DOC_TYPE_LABELS: Record<string, string> = {
  INCOMING_LETTER: 'Surat Masuk',
  OUTGOING_LETTER: 'Surat Keluar',
  DISPOSITION: 'Disposisi',
  MEMO: 'Memo',
  REPORT: 'Laporan',
  DECREE: 'Surat Keputusan',
  OTHER: 'Lainnya',
  SPT: 'SPT',
  NOTA_DINAS: 'Nota Dinas',
}

const STATUS_LABELS: Record<string, string> = {
  LOCAL: 'Saved Locally',
  UPLOADING: 'Uploading',
  PROCESSING: 'Processing',
  EXTRACTING: 'Mengekstrak',
  REVIEW: 'Perlu Ditinjau',
  READY: 'Ready',
  ERROR: 'Error',
}

const IDB_STATUS_MAP: Record<string, DocumentStatus> = {
  pending_sync: 'LOCAL',
  synced: 'READY',
  processing: 'PROCESSING',
  ready: 'READY',
  failed: 'ERROR',
}

type DocumentModel = {
  id: string
  documentNumber: string | null
  documentType: DocumentType | null
  subject: string | null
  sender: string | null
  receiver: string | null
  documentDate: Date | null
  urgency: string | null
  security: string | null
  deadlineStart: Date | null
  deadlineEnd: Date | null
  memo: string | null
  status: DocumentStatus
  extractionStatus: 'pending' | 'completed' | 'failed' | 'manual_only'
  r2Key: string | null
  divisions: { division: { id: string; name: string; color: string } }[]
  [key: string]: unknown
}

type Division = { id: string; name: string }

interface DocumentsViewProps {
  documents: DocumentModel[]
  total: number
  page: number
  pageSize: number
  q: string
  typeFilter: string
  statusFilter: string
  divisionFilter: string
  isAdmin?: boolean
  divisions?: Division[]
  userDivisionId: string | null
}

function idbToModel(doc: LocalDocument): DocumentModel {
  return {
    id: doc.id,
    documentNumber: doc.document_number,
    documentType: null,
    subject: doc.subject,
    sender: doc.sender,
    receiver: doc.receiver,
    documentDate: doc.document_date ? new Date(doc.document_date) : null,
    urgency: doc.urgency,
    security: doc.security,
    deadlineStart: doc.deadline_start ? new Date(doc.deadline_start) : null,
    deadlineEnd: doc.deadline_end ? new Date(doc.deadline_end) : null,
    memo: doc.memo,
    status: (IDB_STATUS_MAP[doc.status] ?? 'READY') as DocumentStatus,
    extractionStatus: doc.extraction_status ?? 'pending',
    r2Key: doc.r2_key,
    divisions: [],
  }
}

export function DocumentsView({
  documents,
  total,
  page,
  pageSize,
  q,
  typeFilter,
  statusFilter,
  divisionFilter,
  isAdmin = false,
  divisions = [],
  userDivisionId,
}: DocumentsViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const isOnline = useOnlineStatus()

  const [viewerDoc, setViewerDoc] = useState<{ id: string; extractionStatus: string } | null>(null)
  const [editDoc, setEditDoc] = useState<DocumentModel | null>(null)

  // Online: local input state, debounced push to URL
  const [searchInput, setSearchInput] = useState(q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(q)
  }, [q])

  // Offline state
  const [idbDocs, setIdbDocs] = useState<DocumentModel[]>([])
  const [offlineSearch, setOfflineSearch] = useState('')
  const [offlineStatus, setOfflineStatus] = useState('')
  const [offlinePage, setOfflinePage] = useState(1)
  const [offlinePageSize, setOfflinePageSize] = useState(20)

  useEffect(() => {
    if (isOnline) return
    listDocuments().then((docs) => {
      const filtered = userDivisionId
        ? docs.filter((d) => (d.division_ids ?? []).includes(userDivisionId))
        : docs
      setIdbDocs(filtered.map(idbToModel))
    })
  }, [isOnline, userDivisionId])

  useEffect(() => {
    if (isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOfflineSearch('')
      setOfflineStatus('')
      setOfflinePage(1)
      startTransition(() => router.refresh())
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  const pushParams = useCallback(
    (overrides: Record<string, string | number>) => {
      const merged: Record<string, string> = {
        ...(page > 1 && { page: String(page) }),
        ...(pageSize !== 20 && { pageSize: String(pageSize) }),
        ...(q && { q }),
        ...(typeFilter && { type: typeFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(divisionFilter && { division: divisionFilter }),
      }
      for (const [k, v] of Object.entries(overrides)) {
        const s = String(v)
        if (s && !(k === 'page' && s === '1')) {
          merged[k] = s
        } else {
          delete merged[k]
        }
      }
      const params = new URLSearchParams(merged)
      router.push(`/documents?${params.toString()}`)
    },
    [page, pageSize, q, typeFilter, statusFilter, divisionFilter, router],
  )

  const onSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushParams({ q: value, page: 1 })
    }, 300)
  }, [pushParams])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const offlineFiltered = useMemo(() => {
    const qLower = offlineSearch.toLowerCase().trim()
    return idbDocs.filter((doc) => {
      if (qLower) {
        const matches =
          doc.documentNumber?.toLowerCase().includes(qLower) ||
          doc.subject?.toLowerCase().includes(qLower) ||
          doc.sender?.toLowerCase().includes(qLower)
        if (!matches) return false
      }
      if (offlineStatus && doc.status !== offlineStatus) return false
      return true
    })
  }, [idbDocs, offlineSearch, offlineStatus])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOfflinePage(1)
  }, [offlineSearch, offlineStatus])

  const offlineTotalPages = Math.max(1, Math.ceil(offlineFiltered.length / offlinePageSize))
  const offlinePageDocs = offlineFiltered.slice(
    (offlinePage - 1) * offlinePageSize,
    offlinePage * offlinePageSize,
  )

  const activeDocuments = isOnline ? documents : offlinePageDocs
  const activePage = isOnline ? page : offlinePage
  const activePageSize = isOnline ? pageSize : offlinePageSize
  const activeTotal = isOnline ? total : offlineFiltered.length
  const activeTotalPages = isOnline ? Math.max(1, Math.ceil(total / pageSize)) : offlineTotalPages
  const hasActiveFilters = isOnline
    ? !!(q || typeFilter || statusFilter || divisionFilter)
    : !!(offlineSearch || offlineStatus)

  const allDocsForModal = isOnline ? documents : idbDocs

  function openEdit(id: string) {
    setEditDoc(allDocsForModal.find((d) => d.id === id) ?? null)
  }

  function closeEdit() { setEditDoc(null) }
  function handleEditSuccess() { startTransition(() => router.refresh()) }

  const editDefaultValues: MetadataFormValues | null = editDoc
    ? {
        documentNumber: editDoc.documentNumber ?? '',
        documentDate: editDoc.documentDate ? editDoc.documentDate.toISOString().split('T')[0] : '',
        sender: editDoc.sender ?? '',
        receiver: editDoc.receiver ?? '',
        subject: editDoc.subject ?? '',
        documentType: editDoc.documentType ?? '',
        urgency: editDoc.urgency ?? '',
        security: editDoc.security ?? '',
        deadlineStart: editDoc.deadlineStart ? editDoc.deadlineStart.toISOString().split('T')[0] : '',
        deadlineEnd: editDoc.deadlineEnd ? editDoc.deadlineEnd.toISOString().split('T')[0] : '',
        memo: editDoc.memo ?? '',
        divisionIds: editDoc.divisions.map((d) => d.division.id),
      }
    : null

  return (
    <>
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <WifiOff className="h-4 w-4 shrink-0" />
          Mode Offline — menampilkan dokumen lokal saja
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari nomor, perihal, pengirim..."
            value={isOnline ? searchInput : offlineSearch}
            onChange={(e) =>
              isOnline ? onSearchChange(e.target.value) : setOfflineSearch(e.target.value)
            }
            className="pl-9"
          />
        </div>

        {isOnline && (
          <Select
            value={typeFilter}
            onValueChange={(v) => pushParams({ type: v ?? '', page: 1 })}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua Jenis">
                {typeFilter ? DOC_TYPE_LABELS[typeFilter] : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Jenis</SelectItem>
              {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={isOnline ? statusFilter : offlineStatus}
          onValueChange={(v) =>
            isOnline ? pushParams({ status: v ?? '', page: 1 }) : setOfflineStatus(v ?? '')
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Status">
              {(isOnline ? statusFilter : offlineStatus)
                ? STATUS_LABELS[isOnline ? statusFilter : offlineStatus]
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && divisions.length > 0 && isOnline && (
          <Select
            value={divisionFilter}
            onValueChange={(v) => pushParams({ division: v ?? '', page: 1 })}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua Divisi">
                {divisionFilter ? divisions.find((d) => d.id === divisionFilter)?.name : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Semua Divisi</SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isOnline) {
                router.push('/documents')
              } else {
                setOfflineSearch('')
                setOfflineStatus('')
                setOfflinePage(1)
              }
            }}
            className="gap-1.5 text-slate-500"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}

        {isAdmin && (
          <Link href="/upload" className={buttonVariants()}>
            <Upload className="mr-2 h-4 w-4" />
            Unggah Dokumen
          </Link>
        )}
      </div>

      <DocumentsTable
        documents={activeDocuments}
        onView={(id) => {
          const doc = allDocsForModal.find((d) => d.id === id)
          setViewerDoc({ id, extractionStatus: doc?.extractionStatus ?? 'pending' })
        }}
        onEdit={openEdit}
      />

      <PaginationControls
        page={activePage}
        totalPages={activeTotalPages}
        pageSize={activePageSize}
        total={activeTotal}
        onPageChange={(p) => (isOnline ? pushParams({ page: p }) : setOfflinePage(p))}
        onPageSizeChange={(s) => {
          if (isOnline) {
            pushParams({ pageSize: s, page: 1 })
          } else {
            setOfflinePageSize(s)
            setOfflinePage(1)
          }
        }}
      />

      <DocumentViewerModal
        documentId={viewerDoc?.id ?? null}
        isOpen={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
        extractionStatus={viewerDoc?.extractionStatus}
      />

      <DocumentEditModal
        documentId={editDoc?.id ?? null}
        defaultValues={editDefaultValues}
        divisions={isAdmin ? divisions : undefined}
        open={!!editDoc}
        onOpenChange={(open) => { if (!open) closeEdit() }}
        onSuccess={handleEditSuccess}
      />
    </>
  )
}
