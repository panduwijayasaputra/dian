'use client'

import type { DocumentStatus, DocumentType } from '@/generated/prisma/enums'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DivisionBadge } from '@/components/admin/division-badge'
import { StatusBadge } from './status-badge'
import { DocumentTypeBadge } from './document-type-badge'
import { EmptyDocuments } from './empty-documents'

type DocumentWithDivisions = {
  id: string
  documentNumber: string | null
  documentType: DocumentType | null
  subject: string | null
  sender: string | null
  documentDate: Date | null
  status: DocumentStatus
  r2Key: string | null
  divisions: {
    division: { id: string; name: string; color: string }
  }[]
  [key: string]: unknown
}

interface DocumentsTableProps {
  documents: DocumentWithDivisions[]
  onView?: (documentId: string) => void
  onEdit?: (documentId: string) => void
}

export function DocumentsTable({ documents, onView, onEdit }: DocumentsTableProps) {
  if (documents.length === 0) {
    return <EmptyDocuments />
  }

  return (
    <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No. Dokumen</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>Perihal</TableHead>
            <TableHead>Pengirim</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Divisi</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-mono text-xs text-slate-600">
                {doc.documentNumber ?? '—'}
              </TableCell>
              <TableCell>
                {doc.documentType ? (
                  <DocumentTypeBadge type={doc.documentType} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="max-w-48 truncate text-slate-700">
                {doc.subject ?? '—'}
              </TableCell>
              <TableCell className="text-slate-600">{doc.sender ?? '—'}</TableCell>
              <TableCell className="text-slate-600">
                {doc.documentDate
                  ? new Date(doc.documentDate).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </TableCell>
              <TableCell>
                {doc.divisions.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {doc.divisions.map(({ division }) => (
                      <DivisionBadge key={division.id} name={division.name} color={division.color} />
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={doc.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      !doc.r2Key ||
                      doc.status === 'LOCAL' ||
                      doc.status === 'EXTRACTING' ||
                      doc.status === 'REVIEW'
                    }
                    onClick={() => onView?.(doc.id)}
                  >
                    Lihat
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(doc.id)}
                  >
                    Edit
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export { }
