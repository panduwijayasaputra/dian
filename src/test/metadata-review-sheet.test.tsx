import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MetadataReviewSheet } from '@/components/documents/metadata-review-sheet'

vi.mock('@/app/(app)/documents/actions', () => ({
  extractDocumentMetadata: vi.fn(),
  saveDocumentMetadata: vi.fn(),
  deleteDocument: vi.fn(),
  getDocumentViewUrl: vi.fn(),
}))

vi.mock('@/lib/idb', () => ({
  upsertDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocument: vi.fn(),
}))

// next/navigation used by child components
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import { extractDocumentMetadata, saveDocumentMetadata } from '@/app/(app)/documents/actions'
import { upsertDocument, getDocument } from '@/lib/idb'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(upsertDocument).mockResolvedValue(undefined)
  vi.mocked(saveDocumentMetadata).mockResolvedValue({ success: true, document: {} as never })
  vi.mocked(getDocument).mockResolvedValue(undefined)
})

describe('MetadataReviewSheet — online (isLocal=false)', () => {
  it('calls extractDocumentMetadata on open', async () => {
    vi.mocked(extractDocumentMetadata).mockResolvedValue({
      success: false,
      error: 'not found',
    })

    render(
      <MetadataReviewSheet
        open
        documentId="server-abc"
        onClose={() => {}}
      />
    )

    await waitFor(() => expect(extractDocumentMetadata).toHaveBeenCalledWith('server-abc'))
  })
})

describe('MetadataReviewSheet — offline (isLocal=true)', () => {
  it('does not call extractDocumentMetadata for a local document', async () => {
    render(
      <MetadataReviewSheet
        open
        documentId="local-abc"
        onClose={() => {}}
        isLocal
      />
    )

    // Give async effects time to fire
    await waitFor(() => {
      expect(extractDocumentMetadata).not.toHaveBeenCalled()
    })
  })

  it('shows the form immediately without a loading spinner', async () => {
    render(
      <MetadataReviewSheet
        open
        documentId="local-abc"
        onClose={() => {}}
        isLocal
      />
    )

    // Spinner should not appear
    expect(screen.queryByText('Mengekstrak metadata…')).not.toBeInTheDocument()
    // Form should be visible
    await waitFor(() =>
      expect(screen.getByText('Simpan Dokumen')).toBeInTheDocument()
    )
  })

  it('preserves existing file_blob when saving metadata for a local document', async () => {
    const fakeBlob = new Blob(['%PDF-fake'], { type: 'application/pdf' })
    vi.mocked(getDocument).mockResolvedValue({
      id: 'local-abc',
      document_number: null,
      document_date: null,
      sender: null,
      receiver: null,
      subject: null,
      urgency: null,
      security: null,
      deadline_start: null,
      deadline_end: null,
      memo: null,
      summary: null,
      extracted_text: null,
      extraction_status: 'pending',
      status: 'pending_sync',
      r2_key: null,
      file_blob: fakeBlob,
      original_name: 'surat.pdf',
      created_at: new Date().toISOString(),
      synced_at: null,
      division_ids: [],
    })

    const user = userEvent.setup()
    render(
      <MetadataReviewSheet
        open
        documentId="local-abc"
        onClose={() => {}}
        isLocal
      />
    )

    await waitFor(() => screen.getByText('Simpan Dokumen'))
    await user.type(screen.getByLabelText(/nomor dokumen/i), 'NO-003/2025')
    await user.type(screen.getByLabelText(/perihal/i), 'Uji Preservasi Blob')
    await user.click(screen.getByRole('button', { name: /simpan dokumen/i }))

    await waitFor(() => {
      expect(upsertDocument).toHaveBeenCalledWith(
        expect.objectContaining({ file_blob: fakeBlob })
      )
    })
  })

  it('saves metadata to IDB instead of calling saveDocumentMetadata', async () => {
    const user = userEvent.setup()

    render(
      <MetadataReviewSheet
        open
        documentId="local-abc"
        onClose={() => {}}
        isLocal
      />
    )

    // Wait for form to appear
    await waitFor(() => screen.getByText('Simpan Dokumen'))

    // Fill required fields
    await user.type(screen.getByLabelText(/nomor dokumen/i), 'NO-002/2025')
    await user.type(screen.getByLabelText(/perihal/i), 'Uji Offline Save')

    // Submit
    await user.click(screen.getByRole('button', { name: /simpan dokumen/i }))

    await waitFor(() => {
      expect(saveDocumentMetadata).not.toHaveBeenCalled()
      expect(upsertDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'local-abc',
          document_number: 'NO-002/2025',
          subject: 'Uji Offline Save',
          status: 'pending_sync',
        })
      )
    })
  })
})
