'use client'

import type { DocumentStatus, DocumentType } from '@/generated/prisma/enums'
import { Eye, Pencil } from 'lucide-react'
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
    <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden **:data-[slot=table-container]:overflow-hidden">
      <Table className="table-fixed w-full [&_th]:h-12 [&_th]:px-5 [&_td]:px-5 [&_td]:py-4">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[13%]">No. Dokumen</TableHead>
            <TableHead className="w-[10%]">Jenis</TableHead>
            <TableHead>Perihal</TableHead>
            <TableHead className="w-[13%]">Pengirim</TableHead>
            <TableHead className="w-[9%]">Tanggal</TableHead>
            <TableHead className="w-[10%]">Divisi</TableHead>
            <TableHead className="w-[9%]">Status</TableHead>
            <TableHead className="w-[7%]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-mono text-xs text-slate-600 truncate">
                {doc.documentNumber ?? '—'}
              </TableCell>
              <TableCell>
                {doc.documentType ? (
                  <DocumentTypeBadge type={doc.documentType} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="truncate text-slate-700">
                {doc.subject ?? '—'}
              </TableCell>
              <TableCell className="truncate text-slate-600">{doc.sender ?? '—'}</TableCell>
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
                <div className="flex items-center gap-1 px-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Lihat dokumen"
                    disabled={
                      !doc.r2Key ||
                      doc.status === 'LOCAL' ||
                      doc.status === 'EXTRACTING' ||
                      doc.status === 'REVIEW'
                    }
                    onClick={() => onView?.(doc.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Edit metadata"
                    onClick={() => onEdit?.(doc.id)}
                  >
                    <Pencil className="h-4 w-4" />
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
