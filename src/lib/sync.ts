import { deleteDocument, getDocument, listDocuments, upsertDocument } from '@/lib/idb'
import { uploadDocument } from '@/app/(app)/upload/actions'
import { getDocumentsForSync } from '@/app/(app)/documents/actions'

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
        // Remove the temporary local record and replace it with the server-assigned id.
        // Status is 'processing' because the server just created the document and will
        // process it asynchronously. downloadAll() will update it to the final status.
        await deleteDocument(doc.id)
        await upsertDocument({
          ...doc,
          id: result.documentId,
          status: 'processing',
          r2_key: null,
          file_blob: null,
          synced_at: new Date().toISOString(),
        })
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
