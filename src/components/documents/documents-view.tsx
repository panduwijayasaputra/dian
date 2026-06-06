'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import type { DocumentStatus, DocumentType } from '@/generated/prisma/enums'
import { buttonVariants } from '@/components/ui/button'
import { DocumentsTable } from './documents-table'
import { DocumentViewerModal } from './document-viewer-modal'
import { DocumentEditModal } from './document-edit-modal'
import type { MetadataFormValues } from './metadata-form'

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
  deadline: Date | null
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
}

export function DocumentsView({ documents, isAdmin = false, divisions = [] }: DocumentsViewProps) {
  const [viewerDoc, setViewerDoc] = useState<{ id: string; extractionStatus: string } | null>(null)
  const [editDoc, setEditDoc] = useState<DocumentModel | null>(null)
  const [, startTransition] = useTransition()
  const router = useRouter()

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
        deadline: editDoc.deadline
          ? editDoc.deadline.toISOString().split('T')[0]
          : '',
        divisionIds: editDoc.divisions.map((d) => d.division.id),
      }
    : null

  return (
    <>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <Link href="/upload" className={buttonVariants()}>
            <Upload className="mr-2 h-4 w-4" />
            Unggah Dokumen
          </Link>
        </div>
      )}

      <DocumentsTable
        documents={documents}
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
