'use server'

import { auth } from '@/auth'
import { extractMetadataFromText, type ExtractionResult } from '@/lib/extract-metadata'
import { extractTextFromR2 } from '@/lib/pdf'
import { prisma } from '@/lib/prisma'
import { getPresignedUrl } from '@/lib/r2'

type ViewUrlResult =
  | { success: true; url: string }
  | { success: false; error: string }

export async function getDocumentViewUrl(documentId: string): Promise<ViewUrlResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated.' }
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  })

  if (!document || document.userId !== session.user.id) {
    return { success: false, error: 'Document not found.' }
  }

  if (!document.r2Key || document.status === 'LOCAL') {
    return { success: false, error: 'Document not available yet.' }
  }

  const url = await getPresignedUrl(document.r2Key)
  return { success: true, url }
}

type ExtractResult =
  | { success: true; result: ExtractionResult }
  | { success: false; error: string }

export async function extractDocumentMetadata(documentId: string): Promise<ExtractResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated.' }
  }

  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document || document.userId !== session.user.id) {
    return { success: false, error: 'Document not found.' }
  }
  if (!document.r2Key) {
    return { success: false, error: 'Document file not available.' }
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'EXTRACTING' },
  })

  const text = await extractTextFromR2(document.r2Key)
  const result = await extractMetadataFromText(text)

  await prisma.document.update({
    where: { id: documentId },
    data: {
      extractedText: text || null,
      extractionResult: result as object,
      status: 'REVIEW',
    },
  })

  return { success: true, result }
}
