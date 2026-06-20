import { deleteDocument, getDocument, listDocuments, upsertDocument, type LocalDocument } from '@/lib/idb'
import { uploadDocument } from '@/app/(app)/upload/actions'
import { extractDocumentMetadata, getDocumentsForSync, saveDocumentMetadata } from '@/app/(app)/documents/actions'

function toMetadataValues(doc: LocalDocument) {
  return {
    documentNumber: doc.document_number ?? '',
    documentDate: doc.document_date ?? '',
    sender: doc.sender ?? '',
    receiver: doc.receiver ?? '',
    subject: doc.subject ?? '',
    documentType: '',
    urgency: doc.urgency ?? '',
    security: doc.security ?? '',
    deadlineStart: doc.deadline_start ?? '',
    deadlineEnd: doc.deadline_end ?? '',
    memo: doc.memo ?? '',
    divisionIds: doc.division_ids ?? [],
  }
}

export async function uploadPending(): Promise<{ uploaded: number; failed: number }> {
  const all = await listDocuments()
  const pending = all.filter((d) => d.status === 'pending_sync')

  let uploaded = 0
  let failed = 0

  for (const doc of pending) {
    if (!doc.file_blob) {
      console.warn('[sync] pending_sync document has no blob, marking failed:', doc.id)
      await upsertDocument({ ...doc, status: 'failed' })
      failed++
      continue
    }

    const file = new File([doc.file_blob], doc.original_name ?? 'document.pdf', {
      type: 'application/pdf',
    })
    const formData = new FormData()
    formData.append('file', file)

    try {
      const result = await uploadDocument(formData)

      if (result.success) {
        await deleteDocument(doc.id)
        await upsertDocument({
          ...doc,
          id: result.documentId,
          status: 'processing',
          r2_key: null,
          file_blob: null,
          synced_at: new Date().toISOString(),
        })
        // Persist metadata the user entered offline onto the newly-created server doc
        const hasMetadata = doc.document_number || doc.sender || doc.subject || doc.document_date
        if (hasMetadata) {
          await saveDocumentMetadata(result.documentId, toMetadataValues(doc))
        }
        extractDocumentMetadata(result.documentId).catch(() => {})
        uploaded++
      } else {
        console.warn('[sync] upload failed for document', doc.id, result.error)
        failed++
      }
    } catch (err) {
      console.warn('[sync] unexpected error uploading document', doc.id, err)
      failed++
    }
  }

  return { uploaded, failed }
}

export async function downloadAll(): Promise<void> {
  const result = await getDocumentsForSync()
  if (!result.success) return

  for (const doc of result.documents) {
    const existing = await getDocument(doc.id)
    // Local wins: never overwrite a pending upload with stale server data
    if (existing?.status === 'pending_sync') continue
    await upsertDocument(doc)
  }
}

export async function syncAll(): Promise<void> {
  await uploadPending()
  await downloadAll()
}
