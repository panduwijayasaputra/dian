import Link from 'next/link'
import { FileText } from 'lucide-react'

interface SourceCardProps {
  documentId: string
  documentNumber: string | null
  subject: string | null
  excerpt: string
}

export function SourceCard({ documentId, documentNumber, subject, excerpt }: SourceCardProps) {
  return (
    <Link href={`/documents?highlight=${documentId}`}>
      <div className="rounded-lg border bg-white p-3 text-xs transition-colors hover:bg-slate-50">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="line-clamp-1">
            {documentNumber ? `${documentNumber} — ` : ''}
            {subject ?? 'Tanpa perihal'}
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-slate-500">{excerpt.slice(0, 120)}</p>
      </div>
    </Link>
  )
}
