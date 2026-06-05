'use client'

import type { DocumentModel } from '@/generated/prisma/models/Document'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './status-badge'
import { DocumentTypeBadge } from './document-type-badge'
import { EmptyDocuments } from './empty-documents'

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  INCOMING_LETTER: 'Surat Masuk',
  OUTGOING_LETTER: 'Surat Keluar',
  DISPOSITION: 'Disposisi',
  MEMO: 'Memo',
  REPORT: 'Laporan',
  DECREE: 'Surat Keputusan',
  OTHER: 'Lainnya',
}

interface DocumentsTableProps {
  documents: DocumentModel[]
  onView?: (documentId: string) => void
}

export function DocumentsTable({ documents, onView }: DocumentsTableProps) {
  if (documents.length === 0) {
    return <EmptyDocuments />
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. Dokumen</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>Perihal</TableHead>
            <TableHead>Pengirim</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-mono text-xs">
                {doc.documentNumber ?? '—'}
              </TableCell>
              <TableCell>
                {doc.documentType ? (
                  <DocumentTypeBadge type={doc.documentType} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="max-w-50 truncate">
                {doc.subject ?? '—'}
              </TableCell>
              <TableCell>{doc.sender ?? '—'}</TableCell>
              <TableCell>
                {doc.documentDate
                  ? new Date(doc.documentDate).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </TableCell>
              <TableCell>
                <StatusBadge status={doc.status} />
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!doc.r2Key}
                  onClick={() => onView?.(doc.id)}
                >
                  Lihat
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export { DOCUMENT_TYPE_LABELS }
