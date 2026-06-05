import { Badge } from '@/components/ui/badge'
import type { DocumentType } from '@/generated/prisma/enums'

const TYPE_CONFIG: Record<DocumentType, { label: string; className: string }> = {
  INCOMING_LETTER: {
    label: 'Surat Masuk',
    className: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  },
  OUTGOING_LETTER: {
    label: 'Surat Keluar',
    className: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
  },
  DISPOSITION: {
    label: 'Disposisi',
    className: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  },
  MEMO: {
    label: 'Memo',
    className: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  },
  REPORT: {
    label: 'Laporan',
    className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
  },
  DECREE: {
    label: 'Surat Keputusan',
    className: 'bg-rose-100 text-rose-700 hover:bg-rose-100',
  },
  OTHER: {
    label: 'Lainnya',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
}

export function DocumentTypeBadge({ type }: { type: DocumentType }) {
  const { label, className } = TYPE_CONFIG[type]
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
