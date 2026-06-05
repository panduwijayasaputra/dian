'use client'

import { useState } from 'react'
import type { DocumentModel } from '@/generated/prisma/models/Document'
import { DocumentsTable } from './documents-table'
import { DocumentViewerModal } from './document-viewer-modal'

export function DocumentsView({ documents }: { documents: DocumentModel[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  function handleView(documentId: string) {
    setSelectedId(documentId)
    setIsModalOpen(true)
  }

  function handleClose() {
    setIsModalOpen(false)
    setSelectedId(null)
  }

  return (
    <>
      <DocumentsTable documents={documents} onView={handleView} />
      <DocumentViewerModal
        documentId={selectedId}
        isOpen={isModalOpen}
        onClose={handleClose}
      />
    </>
  )
}
