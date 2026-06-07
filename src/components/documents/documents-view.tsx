'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Upload, Search, X } from 'lucide-react'
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
import type { MetadataFormValues } from './metadata-form'

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
  isAdmin?: boolean
  divisions?: Division[]
  // Server-side pagination/filter props (passed from page.tsx)
  total?: number
  page?: number
  pageSize?: number
  q?: string
  typeFilter?: string
  statusFilter?: string
  divisionFilter?: string
  userDivisionId?: string | null
}

export function DocumentsView({
  documents,
  isAdmin = false,
  divisions = [],
  // Pagination/filter props accepted but filtering handled client-side for now
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  total: _total,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  page: _page,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pageSize: _pageSize,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  q: _q,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  typeFilter: _typeFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  statusFilter: _statusFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  divisionFilter: _divisionFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userDivisionId: _userDivisionId,
}: DocumentsViewProps) {
  const [viewerDoc, setViewerDoc] = useState<{ id: string; extractionStatus: string } | null>(null)
  const [editDoc, setEditDoc] = useState<DocumentModel | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')

  const filteredDocuments = useMemo(() => {
    const q = search.toLowerCase().trim()
    return documents.filter((doc) => {
      if (q) {
        const matches =
          doc.documentNumber?.toLowerCase().includes(q) ||
          doc.subject?.toLowerCase().includes(q) ||
          doc.sender?.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (typeFilter && doc.documentType !== typeFilter) return false
      if (statusFilter && doc.status !== statusFilter) return false
      if (divisionFilter && !doc.divisions.some((d) => d.division.id === divisionFilter)) return false
      return true
    })
  }, [documents, search, typeFilter, statusFilter, divisionFilter])

  const hasActiveFilters = !!(search || typeFilter || statusFilter || divisionFilter)

  function clearFilters() {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
    setDivisionFilter('')
  }

  const docTypes = useMemo(
    () => [...new Set(documents.map((d) => d.documentType).filter(Boolean))] as DocumentType[],
    [documents],
  )
  const statuses = useMemo(
    () => [...new Set(documents.map((d) => d.status))],
    [documents],
  )

  function openEdit(id: string) {
    const doc = documents.find((d) => d.id === id) ?? null
    setEditDoc(doc)
  }

  function closeEdit() {
    setEditDoc(null)
  }

  function handleEditSuccess() {
    startTransition(() => router.refresh())
  }

  const editDefaultValues: MetadataFormValues | null = editDoc
    ? {
        documentNumber: editDoc.documentNumber ?? '',
        documentDate: editDoc.documentDate
          ? editDoc.documentDate.toISOString().split('T')[0]
          : '',
        sender: editDoc.sender ?? '',
        receiver: editDoc.receiver ?? '',
        subject: editDoc.subject ?? '',
        documentType: editDoc.documentType ?? '',
        urgency: editDoc.urgency ?? '',
        security: editDoc.security ?? '',
        deadlineStart: editDoc.deadlineStart
          ? editDoc.deadlineStart.toISOString().split('T')[0]
          : '',
        deadlineEnd: editDoc.deadlineEnd
          ? editDoc.deadlineEnd.toISOString().split('T')[0]
          : '',
        memo: editDoc.memo ?? '',
        divisionIds: editDoc.divisions.map((d) => d.division.id),
      }
    : null

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari nomor, perihal, pengirim..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? '')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Jenis">
              {typeFilter ? DOC_TYPE_LABELS[typeFilter] : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Jenis</SelectItem>
            {docTypes.map((t) => (
              <SelectItem key={t} value={t}>{DOC_TYPE_LABELS[t] ?? t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? '')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Status">
              {statusFilter ? STATUS_LABELS[statusFilter] : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && divisions.length > 0 && (
          <Select value={divisionFilter} onValueChange={(v) => setDivisionFilter(v ?? '')}>
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
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-slate-500">
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

      {hasActiveFilters && (
        <p className="text-sm text-slate-500">
          {filteredDocuments.length} dari {documents.length} dokumen
        </p>
      )}

      <DocumentsTable
        documents={filteredDocuments}
        onView={(id) => {
          const doc = documents.find((d) => d.id === id)
          setViewerDoc({ id, extractionStatus: doc?.extractionStatus ?? 'pending' })
        }}
        onEdit={openEdit}
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
