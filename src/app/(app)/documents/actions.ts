'use server'

import { auth } from '@/auth'
import { extractMetadataFromText, type ExtractionResult } from '@/lib/extract-metadata'
import { extractTextFromR2 } from '@/lib/pdf'
import { prisma } from '@/lib/prisma'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import type { MetadataFormValues } from '@/components/documents/metadata-form'
import { getPresignedUrl, r2Client } from '@/lib/r2'

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
  | { success: true; result: ExtractionResult; document: Awaited<ReturnType<typeof prisma.document.findUniqueOrThrow>> }
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

  const updated = await prisma.document.findUniqueOrThrow({ where: { id: documentId } })
  return { success: true, result, document: updated }
}

type SimpleResult = { success: true } | { success: false; error: string }

type SaveResult =
  | { success: true; document: Awaited<ReturnType<typeof prisma.document.findUniqueOrThrow>> }
  | { success: false; error: string }

export async function saveDocumentMetadata(
  documentId: string,
  values: MetadataFormValues,
): Promise<SaveResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not authenticated.' }

  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document || document.userId !== session.user.id) {
    return { success: false, error: 'Document not found.' }
  }

  const documentDate = values.documentDate ? new Date(values.documentDate) : null

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      documentNumber: values.documentNumber || null,
      documentDate,
      sender: values.sender || null,
      subject: values.subject || null,
      documentType: (values.documentType as never) || null,
      status: 'READY',
    },
  })

  return { success: true, document: updated }
}

export async function deleteDocument(documentId: string): Promise<SimpleResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not authenticated.' }

  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document || document.userId !== session.user.id) {
    return { success: false, error: 'Document not found.' }
  }

  if (document.r2Key) {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: document.r2Key,
      }),
    )
  }

  await prisma.document.delete({ where: { id: documentId } })
  return { success: true }
}

export async function updateDocumentMetadata(
  documentId: string,
  values: MetadataFormValues,
): Promise<SimpleResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not authenticated.' }

  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document || document.userId !== session.user.id) {
    return { success: false, error: 'Document not found.' }
  }

  const documentDate = values.documentDate ? new Date(values.documentDate) : null

  await prisma.document.update({
    where: { id: documentId },
    data: {
      documentNumber: values.documentNumber || null,
      documentDate,
      sender: values.sender || null,
      subject: values.subject || null,
      documentType: (values.documentType as never) || null,
    },
  })

  return { success: true }
}
