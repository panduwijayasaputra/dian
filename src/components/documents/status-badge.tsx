import { Badge } from '@/components/ui/badge'
import type { DocumentStatus, EmbeddingStatus } from '@/generated/prisma/enums'

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  LOCAL: {
    label: 'Saved Locally',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
  UPLOADING: {
    label: 'Uploading',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  PROCESSING: {
    label: 'Processing',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  },
  EXTRACTING: {
    label: 'Mengekstrak',
    className: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  },
  REVIEW: {
    label: 'Perlu Ditinjau',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  },
  READY: {
    label: 'Ready',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  ERROR: {
    label: 'Error',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

const EMBEDDING_STATUS_CONFIG: Record<EmbeddingStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Menunggu',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  },
  PROCESSING: {
    label: 'Memproses',
    className: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  },
  COMPLETED: {
    label: 'Terindeks',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
  },
  FAILED: {
    label: 'Gagal',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
  },
}

export function EmbeddingStatusBadge({ status }: { status: EmbeddingStatus }) {
  const { label, className } = EMBEDDING_STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
