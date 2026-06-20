'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MetadataReviewSheet } from '@/components/documents/metadata-review-sheet'
import { DropZone } from '@/components/upload/drop-zone'

type Division = { id: string; name: string }

interface UploadFlowProps {
  divisions: Division[]
}

export function UploadFlow({ divisions }: UploadFlowProps) {
  const router = useRouter()
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [isLocal, setIsLocal] = useState(false)

  function handleSheetClose() {
    setDocumentId(null)
    setIsLocal(false)
    router.push('/documents')
  }

  return (
    <>
      <DropZone
        onUploadComplete={(id, local) => {
          setDocumentId(id)
          setIsLocal(local ?? false)
        }}
      />
      <MetadataReviewSheet
        open={!!documentId}
        documentId={documentId}
        onClose={handleSheetClose}
        divisions={divisions}
        isLocal={isLocal}
      />
    </>
  )
}
