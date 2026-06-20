import { FileText } from 'lucide-react'

interface SourceCardProps {
  documentId: string
  documentNumber: string | null
  subject: string | null
  excerpt: string
  onView: (documentId: string) => void
}

export function SourceCard({ documentId, documentNumber, subject, onView }: SourceCardProps) {
  return (
    <button
      onClick={() => onView(documentId)}
      className="w-full rounded-lg border bg-white p-3 text-left text-xs transition-colors hover:bg-slate-50"
    >
      <div className="flex items-center gap-1.5 font-medium text-slate-700">
        <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="line-clamp-1">
          {documentNumber ? `${documentNumber} — ` : ''}
          {subject ?? 'Tanpa perihal'}
        </span>
      </div>
    </button>
  )
}
