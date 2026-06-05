'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MetadataReviewSheet } from '@/components/documents/metadata-review-sheet'
import { DropZone } from '@/components/upload/drop-zone'

export function UploadFlow() {
  const router = useRouter()
  const [documentId, setDocumentId] = useState<string | null>(null)

  function handleSheetClose() {
    setDocumentId(null)
    router.push('/documents')
  }

  return (
    <>
      <DropZone onUploadComplete={(id) => setDocumentId(id)} />
      <MetadataReviewSheet
        open={!!documentId}
        documentId={documentId}
        onClose={handleSheetClose}
      />
    </>
  )
}
