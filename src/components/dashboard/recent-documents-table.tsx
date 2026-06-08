'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Card } from '@/components/ui/card'
import { DocumentViewerModal } from '@/components/documents/document-viewer-modal'
import type { RecentDocument } from '@/lib/dashboard'

type Props = {
  documents: RecentDocument[]
}

export function RecentDocumentsTable({ documents }: Props) {
  const [selected, setSelected] = useState<RecentDocument | null>(null)

  return (
    <>
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Dokumen Terbaru</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4">Nomor</th>
                <th className="pb-3 pr-4">Perihal</th>
                <th className="pb-3 pr-4">Tanggal</th>
                <th className="pb-3">Divisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-slate-400">
                    Belum ada dokumen.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelected(doc)}
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600">
                      {doc.documentNumber ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{doc.subject ?? '—'}</td>
                    <td className="py-3 pr-4 text-slate-500">
                      {doc.documentDate
                        ? format(new Date(doc.documentDate), 'd MMM yyyy', { locale: id })
                        : '—'}
                    </td>
                    <td className="py-3">
                      {doc.divisions.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary">
                            {doc.divisions[0]}
                          </span>
                          {doc.divisions.length > 1 && (
                            <span className="text-xs text-slate-400">
                              +{doc.divisions.length - 1} lagi
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <DocumentViewerModal
        documentId={selected?.id ?? null}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        extractionStatus={selected?.extractionStatus}
      />
    </>
  )
}
