'use server'

import { auth } from '@/auth'
import type { LocalDocument } from '@/lib/idb'
import { chunkText } from '@/lib/chunk-text'
import { extractMetadataFromText, type ExtractionResult } from '@/lib/extract-metadata'
import { generateEmbedding } from '@/lib/generate-embeddings'
import { generateSummary } from '@/lib/generate-summary'
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

  if (!document) {
    return { success: false, error: 'Document not found.' }
  }

  if (session.user.role !== 'ADMIN') {
    const divisionId = session.user.divisionId
    if (!divisionId) return { success: false, error: 'Document not found.' }
    const access = await prisma.documentDivision.findFirst({
      where: { documentId, divisionId },
    })
    if (!access) return { success: false, error: 'Document not found.' }
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
  const summary = await generateSummary(text)

  await prisma.document.update({
    where: { id: documentId },
    data: {
      extractedText: text || null,
      extractionResult: result as object,
      summary,
      status: 'REVIEW',
    },
  })

  const chunks = chunkText(text)
  if (chunks.length > 0) {
    try {
      await prisma.documentChunk.createMany({
        data: chunks.map((content, chunkIndex) => ({ documentId, content, chunkIndex })),
      })
    } catch (err) {
      console.error('[chunk] Failed to store chunks:', err)
    }
  }

  try {
    const storedChunks = await prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    })

    if (storedChunks.length > 0) {
      await prisma.document.update({
        where: { id: documentId },
        data: { embeddingStatus: 'PROCESSING' },
      })

      let successCount = 0
      for (const chunk of storedChunks) {
        const vector = await generateEmbedding(chunk.content)
        if (vector) {
          await prisma.$executeRaw`
            UPDATE "DocumentChunk"
            SET embedding = ${JSON.stringify(vector)}::vector
            WHERE id = ${chunk.id}
          `
          successCount++
        }
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { embeddingStatus: successCount > 0 ? 'COMPLETED' : 'FAILED' },
      })
    }
  } catch (err) {
    console.error('[embedding] Pipeline error:', err)
    await prisma.document.update({
      where: { id: documentId },
      data: { embeddingStatus: 'FAILED' },
    })
  }

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

  const [updated] = await prisma.$transaction([
    prisma.document.update({
      where: { id: documentId },
      data: {
        documentNumber: values.documentNumber || null,
        documentDate,
        sender: values.sender || null,
        subject: values.subject || null,
        documentType: (values.documentType as never) || null,
        status: 'READY',
      },
    }),
    prisma.documentDivision.deleteMany({ where: { documentId } }),
  ])

  if (values.divisionIds && values.divisionIds.length > 0) {
    await prisma.documentDivision.createMany({
      data: values.divisionIds.map((divisionId) => ({ documentId, divisionId })),
      skipDuplicates: true,
    })
  }

  return { success: true, document: updated }
}

export async function deleteDocument(documentId: string): Promise<SimpleResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Not authenticated.' }
  if (session.user.role !== 'ADMIN') return { success: false, error: 'Not authorized.' }

  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document) {
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
  if (session.user.role !== 'ADMIN') return { success: false, error: 'Not authorized.' }

  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document) {
    return { success: false, error: 'Document not found.' }
  }

  const documentDate = values.documentDate ? new Date(values.documentDate) : null

  await prisma.$transaction([
    prisma.document.update({
      where: { id: documentId },
      data: {
        documentNumber: values.documentNumber || null,
        documentDate,
        sender: values.sender || null,
        subject: values.subject || null,
        documentType: (values.documentType as never) || null,
      },
    }),
    prisma.documentDivision.deleteMany({ where: { documentId } }),
  ])

  if (values.divisionIds && values.divisionIds.length > 0) {
    await prisma.documentDivision.createMany({
      data: values.divisionIds.map((divisionId) => ({ documentId, divisionId })),
      skipDuplicates: true,
    })
  }

  return { success: true }
}

type SyncResult =
  | { success: true; documents: LocalDocument[] }
  | { success: false }

function mapStatus(status: string): LocalDocument['status'] {
  switch (status) {
    case 'READY': return 'ready'
    case 'ERROR': return 'failed'
    case 'LOCAL': return 'pending_sync'
    default: return 'processing'
  }
}

export async function getDocumentsForSync(): Promise<SyncResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false }

  const isAdmin = session.user.role === 'ADMIN'
  const divisionId = session.user.divisionId ?? null

  const docs = await prisma.document.findMany({
    where: isAdmin
      ? { status: { not: 'LOCAL' } }
      : { divisions: { some: { divisionId: divisionId ?? '' } } },
    select: {
      id: true,
      documentNumber: true,
      documentDate: true,
      sender: true,
      subject: true,
      summary: true,
      extractedText: true,
      r2Key: true,
      status: true,
      createdAt: true,
      divisions: { select: { divisionId: true } },
    },
  })

  const now = new Date().toISOString()

  const documents: LocalDocument[] = docs.map((doc) => ({
    id: doc.id,
    document_number: doc.documentNumber,
    document_date: doc.documentDate ? doc.documentDate.toISOString().split('T')[0] : null,
    sender: doc.sender,
    subject: doc.subject,
    summary: doc.summary,
    extracted_text: doc.extractedText,
    status: mapStatus(doc.status),
    r2_key: doc.r2Key,
    file_blob: null,
    original_name: null,
    created_at: doc.createdAt.toISOString(),
    synced_at: now,
    division_ids: doc.divisions.map((d) => d.divisionId),
  }))

  return { success: true, documents }
}
