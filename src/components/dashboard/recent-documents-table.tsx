'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { ChevronRight, FileText } from 'lucide-react'
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
        <div className="mb-4 flex items-center gap-2.5">
          <div className="rounded-lg bg-slate-100 p-1.5">
            <FileText className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Dokumen Terbaru</h2>
            <p className="text-xs text-slate-400">5 dokumen terakhir ditambahkan</p>
          </div>
        </div>
        {documents.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Belum ada dokumen.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">Nomor</th>
                    <th className="pb-3 pr-4">Perihal</th>
                    <th className="pb-3 pr-4">Tanggal</th>
                    <th className="pb-3">Divisi</th>
                    <th className="w-4 pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="group/row cursor-pointer transition-colors duration-150 hover:bg-slate-50"
                      onClick={() => setSelected(doc)}
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-slate-500">
                        {doc.documentNumber ?? '—'}
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-700">{doc.subject ?? '—'}</td>
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
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
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
                      <td className="py-3 pl-2">
                        <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="cursor-pointer rounded-lg border border-border/60 p-3 transition-colors duration-150 hover:bg-slate-50"
                  onClick={() => setSelected(doc)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-700 leading-snug">
                      {doc.subject ?? <span className="italic text-slate-400">Tanpa perihal</span>}
                    </p>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {doc.documentNumber && (
                      <span className="font-mono text-xs text-slate-400">{doc.documentNumber}</span>
                    )}
                    {doc.documentDate && (
                      <span className="text-xs text-slate-400">
                        {format(new Date(doc.documentDate), 'd MMM yyyy', { locale: id })}
                      </span>
                    )}
                    {doc.divisions.length > 0 && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {doc.divisions[0]}
                        {doc.divisions.length > 1 && ` +${doc.divisions.length - 1}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
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
