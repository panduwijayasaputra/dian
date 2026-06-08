# Documents Pagination, Search & Filter — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace client-side document filtering with server-side pagination + search + filter via URL params, with an offline fallback using IndexedDB.

**Architecture:** URL params (`?page`, `q`, `type`, `status`, `division`, `pageSize`) drive server-side DB queries. `DocumentsView` detects online/offline via a hook; online = URL-param state, offline = IDB + client-side state. A `PaginationControls` component handles prev/next/page-size UI.

**Tech Stack:** Next.js App Router (server component `searchParams`), Prisma, `idb` (IndexedDB), React hooks, shadcn/ui Select + Button.

---

### Task 1: Create `useOnlineStatus` hook

**Files:**
- Create: `src/hooks/use-online-status.ts`

**Step 1: Create the hook**

```ts
'use client'

import { useEffect, useState } from 'react'

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-online-status.ts
git commit -m "feat: add useOnlineStatus hook"
```

---

### Task 2: Create `PaginationControls` component

**Files:**
- Create: `src/components/ui/pagination-controls.tsx`

**Step 1: Implement the component**

```tsx
'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PaginationControlsProps {
  page: number
  totalPages: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const PAGE_SIZES = [10, 20, 50]

export function PaginationControls({
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const pages = buildPageRange(page, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-sm text-slate-500">
        {total === 0 ? '0 dokumen' : `${start}–${end} dari ${total} dokumen`}
      </p>

      <div className="flex items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} per halaman
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-slate-400">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  pages.push(1)
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
```

**Step 2: Commit**

```bash
git add src/components/ui/pagination-controls.tsx
git commit -m "feat: add PaginationControls component"
```

---

### Task 3: Refactor `documents/page.tsx` to server-side pagination

**Files:**
- Modify: `src/app/(app)/documents/page.tsx`

**Step 1: Replace the existing page with a paginated version**

```tsx
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DocumentsView } from '@/components/documents/documents-view'
import type { Prisma } from '@/generated/prisma'

interface PageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    q?: string
    type?: string
    status?: string
    division?: string
  }>
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const session = await auth()
  const isAdmin = session!.user.role === 'ADMIN'
  const divisionId = session!.user.divisionId

  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = [10, 20, 50].includes(Number(params.pageSize)) ? Number(params.pageSize) : 20
  const q = params.q?.trim() ?? ''
  const typeFilter = params.type ?? ''
  const statusFilter = params.status ?? ''
  const divisionFilter = params.division ?? ''

  const skip = (page - 1) * pageSize

  const baseCondition: Prisma.DocumentWhereInput = isAdmin
    ? { status: { not: 'LOCAL' } }
    : { divisions: { some: { divisionId: divisionId ?? '' } } }

  const searchCondition: Prisma.DocumentWhereInput = q
    ? {
        OR: [
          { documentNumber: { contains: q, mode: 'insensitive' } },
          { subject: { contains: q, mode: 'insensitive' } },
          { sender: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {}

  const where: Prisma.DocumentWhereInput = {
    AND: [
      baseCondition,
      searchCondition,
      typeFilter ? { documentType: typeFilter as Prisma.EnumDocumentTypeFilter['equals'] } : {},
      statusFilter ? { status: statusFilter as Prisma.EnumDocumentStatusFilter['equals'] } : {},
      divisionFilter ? { divisions: { some: { divisionId: divisionFilter } } } : {},
    ].filter((c) => Object.keys(c).length > 0),
  }

  const select = {
    id: true,
    documentNumber: true,
    documentType: true,
    subject: true,
    sender: true,
    receiver: true,
    documentDate: true,
    urgency: true,
    security: true,
    deadlineStart: true,
    deadlineEnd: true,
    memo: true,
    status: true,
    extractionStatus: true,
    r2Key: true,
    originalName: true,
    divisions: {
      include: { division: { select: { id: true, name: true, color: true } } },
    },
  }

  const [documents, total, divisions] = await Promise.all([
    prisma.document.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, select }),
    prisma.document.count({ where }),
    isAdmin
      ? prisma.division.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dokumen</h1>
        <p className="mt-1 text-sm text-slate-500">Semua dokumen yang dapat Anda akses</p>
      </div>
      <DocumentsView
        documents={documents}
        total={total}
        page={page}
        pageSize={pageSize}
        q={q}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        divisionFilter={divisionFilter}
        isAdmin={isAdmin}
        divisions={divisions}
        userDivisionId={divisionId ?? null}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/(app)/documents/page.tsx
git commit -m "feat: server-side paginated query for documents page"
```

---

### Task 4: Refactor `DocumentsView` for online + offline dual-mode

**Files:**
- Modify: `src/components/documents/documents-view.tsx`

**Step 1: Replace the entire file**

Replace the existing `documents-view.tsx` with the full dual-mode implementation below.

Key changes from current:
- Props now include `total`, `page`, `pageSize`, `q`, `typeFilter`, `statusFilter`, `divisionFilter`, `userDivisionId`
- Remove `useMemo` client-side filter logic for online mode
- Online: filter/page/size changes → `router.push()` with new URL params
- Search uses local state + 300ms debounce before pushing to URL
- Offline: load from IDB, client-side filter + pagination, show banner
- On reconnect: `router.refresh()`
- Bottom: `<PaginationControls />` with callbacks

```tsx
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

// IDB status → display status mapping
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
    documentType: null, // not stored in IDB
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

  // Viewer / edit modals (same as before)
  const [viewerDoc, setViewerDoc] = useState<{ id: string; extractionStatus: string } | null>(null)
  const [editDoc, setEditDoc] = useState<DocumentModel | null>(null)

  // Online mode: local state only for the search input (debounced push to URL)
  const [searchInput, setSearchInput] = useState(q)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync searchInput when URL param changes (e.g. browser back/forward)
  useEffect(() => {
    setSearchInput(q)
  }, [q])

  // Offline mode state
  const [idbDocs, setIdbDocs] = useState<DocumentModel[]>([])
  const [offlineSearch, setOfflineSearch] = useState('')
  const [offlineType, setOfflineType] = useState('')
  const [offlineStatus, setOfflineStatus] = useState('')
  const [offlinePage, setOfflinePage] = useState(1)
  const [offlinePageSize, setOfflinePageSize] = useState(20)

  // Load IDB docs when offline
  useEffect(() => {
    if (isOnline) return
    listDocuments().then((docs) => {
      const filtered = userDivisionId
        ? docs.filter((d) => (d.division_ids ?? []).includes(userDivisionId))
        : docs
      setIdbDocs(filtered.map(idbToModel))
    })
  }, [isOnline, userDivisionId])

  // Refresh when coming back online
  useEffect(() => {
    if (isOnline) {
      startTransition(() => router.refresh())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // Online mode: push URL params
  const pushParams = useCallback(
    (overrides: Record<string, string | number>) => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(q && { q }),
        ...(typeFilter && { type: typeFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(divisionFilter && { division: divisionFilter }),
        ...Object.fromEntries(
          Object.entries(overrides).map(([k, v]) => [k, String(v)]),
        ),
      })
      // Remove empty values
      for (const [k, v] of [...params.entries()]) {
        if (!v || v === '1' && k === 'page') params.delete(k)
      }
      router.push(`/documents?${params.toString()}`)
    },
    [page, pageSize, q, typeFilter, statusFilter, divisionFilter, router],
  )

  function onSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushParams({ q: value, page: 1 })
    }, 300)
  }

  function onTypeChange(value: string) {
    pushParams({ type: value, page: 1 })
  }

  function onStatusChange(value: string) {
    pushParams({ status: value, page: 1 })
  }

  function onDivisionChange(value: string) {
    pushParams({ division: value, page: 1 })
  }

  function onPageChange(p: number) {
    pushParams({ page: p })
  }

  function onPageSizeChange(s: number) {
    pushParams({ pageSize: s, page: 1 })
  }

  function clearFilters() {
    setSearchInput('')
    router.push('/documents')
  }

  // Offline: filtered + paginated docs
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
      if (offlineType && doc.documentType !== offlineType) return false
      if (offlineStatus && doc.status !== offlineStatus) return false
      return true
    })
  }, [idbDocs, offlineSearch, offlineType, offlineStatus])

  const offlineTotalPages = Math.max(1, Math.ceil(offlineFiltered.length / offlinePageSize))
  const offlinePageDocs = offlineFiltered.slice(
    (offlinePage - 1) * offlinePageSize,
    offlinePage * offlinePageSize,
  )

  // Determine what to render
  const activeDocuments = isOnline ? documents : offlinePageDocs
  const activePage = isOnline ? page : offlinePage
  const activePageSize = isOnline ? pageSize : offlinePageSize
  const activeTotal = isOnline ? total : offlineFiltered.length
  const activeTotalPages = isOnline ? Math.max(1, Math.ceil(total / pageSize)) : offlineTotalPages
  const hasActiveFilters = isOnline
    ? !!(q || typeFilter || statusFilter || divisionFilter)
    : !!(offlineSearch || offlineType || offlineStatus)

  // Modals
  const allDocsForModal = isOnline ? documents : idbDocs

  function openEdit(id: string) {
    const doc = allDocsForModal.find((d) => d.id === id) ?? null
    setEditDoc(doc)
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
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <WifiOff className="h-4 w-4 shrink-0" />
          Mode Offline — menampilkan dokumen lokal saja
        </div>
      )}

      {/* Filters */}
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

        <Select
          value={isOnline ? typeFilter : offlineType}
          onValueChange={(v) => isOnline ? onTypeChange(v ?? '') : setOfflineType(v ?? '')}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Jenis">
              {(isOnline ? typeFilter : offlineType)
                ? DOC_TYPE_LABELS[isOnline ? typeFilter : offlineType]
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Jenis</SelectItem>
            {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={isOnline ? statusFilter : offlineStatus}
          onValueChange={(v) => isOnline ? onStatusChange(v ?? '') : setOfflineStatus(v ?? '')}
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
          <Select value={divisionFilter} onValueChange={(v) => onDivisionChange(v ?? '')}>
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
                clearFilters()
              } else {
                setOfflineSearch('')
                setOfflineType('')
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
        onPageChange={(p) => isOnline ? onPageChange(p) : setOfflinePage(p)}
        onPageSizeChange={(s) => isOnline ? onPageSizeChange(s) : (setOfflinePageSize(s), setOfflinePage(1))}
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
```

**Step 2: Check TypeScript compiles without errors**

```bash
pnpm tsc --noEmit
```

Expected: no errors (or only pre-existing unrelated errors).

**Step 3: Commit**

```bash
git add src/components/documents/documents-view.tsx
git commit -m "feat: documents page — server-side pagination, search, filter with offline fallback"
```

---

## Done

All tasks complete. The documents page now:
- Fetches only the current page from the database (server-side)
- Search + filter changes update URL params (shareable, bookmarkable)
- Offline mode loads IndexedDB and paginates client-side
- Page size is user-selectable (10 / 20 / 50)
