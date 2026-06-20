import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LocalDocument } from '@/lib/idb'

vi.mock('@/lib/idb', () => ({
  listDocuments: vi.fn(),
  deleteDocument: vi.fn(),
  upsertDocument: vi.fn(),
  getDocument: vi.fn(),
}))

vi.mock('@/app/(app)/upload/actions', () => ({
  uploadDocument: vi.fn(),
}))

vi.mock('@/app/(app)/documents/actions', () => ({
  getDocumentsForSync: vi.fn(),
  saveDocumentMetadata: vi.fn(),
  extractDocumentMetadata: vi.fn(),
}))

import { listDocuments, deleteDocument, upsertDocument } from '@/lib/idb'
import { uploadDocument } from '@/app/(app)/upload/actions'
import { getDocumentsForSync, saveDocumentMetadata, extractDocumentMetadata } from '@/app/(app)/documents/actions'
import { uploadPending, downloadAll } from '@/lib/sync'

const pendingDoc: LocalDocument = {
  id: 'local-abc',
  document_number: 'NO-001/2025',
  document_date: '2025-01-15',
  sender: 'Kementerian A',
  receiver: 'Bagian B',
  subject: 'Perihal Pengujian',
  urgency: 'SEGERA',
  security: null,
  deadline_start: null,
  deadline_end: null,
  memo: 'Catatan penting',
  summary: null,
  extracted_text: null,
  extraction_status: 'pending',
  status: 'pending_sync',
  r2_key: null,
  file_blob: new Blob(['%PDF-fake'], { type: 'application/pdf' }),
  original_name: 'surat-masuk.pdf',
  created_at: '2025-01-15T10:00:00.000Z',
  synced_at: null,
  division_ids: ['div-1'],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(upsertDocument).mockResolvedValue(undefined)
  vi.mocked(deleteDocument).mockResolvedValue(undefined)
})

describe('uploadPending', () => {
  it('calls saveDocumentMetadata with IDB metadata after successful upload', async () => {
    vi.mocked(listDocuments).mockResolvedValue([pendingDoc])
    vi.mocked(uploadDocument).mockResolvedValue({ success: true, documentId: 'server-xyz' })
    vi.mocked(saveDocumentMetadata).mockResolvedValue({ success: true, document: {} as never })

    await uploadPending()

    expect(saveDocumentMetadata).toHaveBeenCalledWith('server-xyz', {
      documentNumber: 'NO-001/2025',
      documentDate: '2025-01-15',
      sender: 'Kementerian A',
      receiver: 'Bagian B',
      subject: 'Perihal Pengujian',
      documentType: '',
      urgency: 'SEGERA',
      security: '',
      deadlineStart: '',
      deadlineEnd: '',
      memo: 'Catatan penting',
      divisionIds: ['div-1'],
    })
  })

  it('does not call saveDocumentMetadata when upload fails', async () => {
    vi.mocked(listDocuments).mockResolvedValue([pendingDoc])
    vi.mocked(uploadDocument).mockResolvedValue({ success: false, error: 'Network error' })

    await uploadPending()

    expect(saveDocumentMetadata).not.toHaveBeenCalled()
  })

  it('triggers extractDocumentMetadata after successful upload', async () => {
    vi.mocked(listDocuments).mockResolvedValue([pendingDoc])
    vi.mocked(uploadDocument).mockResolvedValue({ success: true, documentId: 'server-xyz' })
    vi.mocked(saveDocumentMetadata).mockResolvedValue({ success: true, document: {} as never })
    vi.mocked(extractDocumentMetadata).mockResolvedValue({ success: true } as never)

    await uploadPending()

    expect(extractDocumentMetadata).toHaveBeenCalledWith('server-xyz')
  })

  it('does not fail sync when extractDocumentMetadata rejects', async () => {
    vi.mocked(listDocuments).mockResolvedValue([pendingDoc])
    vi.mocked(uploadDocument).mockResolvedValue({ success: true, documentId: 'server-xyz' })
    vi.mocked(saveDocumentMetadata).mockResolvedValue({ success: true, document: {} as never })
    vi.mocked(extractDocumentMetadata).mockRejectedValue(new Error('OpenAI timeout'))

    const result = await uploadPending()

    expect(result.uploaded).toBe(1)
    expect(result.failed).toBe(0)
  })

  it('skips docs without a file_blob', async () => {
    const noBlob: LocalDocument = { ...pendingDoc, file_blob: null }
    vi.mocked(listDocuments).mockResolvedValue([noBlob])

    const result = await uploadPending()

    expect(uploadDocument).not.toHaveBeenCalled()
    expect(result.failed).toBe(1)
  })
})

describe('downloadAll', () => {
  it('does not overwrite a pending_sync local doc with server data', async () => {
    const serverDoc: LocalDocument = { ...pendingDoc, id: 'local-abc', status: 'processing', file_blob: null }
    vi.mocked(getDocumentsForSync).mockResolvedValue({ success: true, documents: [serverDoc] })

    const { getDocument } = await import('@/lib/idb')
    vi.mocked(getDocument).mockResolvedValue(pendingDoc)

    await downloadAll()

    expect(upsertDocument).not.toHaveBeenCalled()
  })
})
