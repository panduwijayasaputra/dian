'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ConfidenceLevel } from '@/lib/extract-metadata'

export interface MetadataFormValues {
  documentNumber: string
  documentDate: string
  sender: string
  subject: string
  documentType: string
}

const metadataSchema = z.object({
  documentNumber: z.string().min(1, 'Nomor dokumen wajib diisi'),
  documentDate: z.string(),
  sender: z.string(),
  subject: z.string().min(1, 'Perihal wajib diisi'),
  documentType: z.string(),
})

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'INCOMING_LETTER', label: 'Surat Masuk' },
  { value: 'OUTGOING_LETTER', label: 'Surat Keluar' },
  { value: 'DISPOSITION', label: 'Disposisi' },
  { value: 'MEMO', label: 'Memo' },
  { value: 'REPORT', label: 'Laporan' },
  { value: 'DECREE', label: 'Surat Keputusan' },
  { value: 'OTHER', label: 'Lainnya' },
]

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: {
    label: 'AI · Tinggi',
    className: 'bg-green-100 text-green-700 hover:bg-green-100 text-xs font-normal',
  },
  medium: {
    label: 'AI · Sedang',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs font-normal',
  },
  low: {
    label: 'AI · Rendah',
    className: 'bg-red-100 text-red-700 hover:bg-red-100 text-xs font-normal',
  },
}

interface MetadataFormProps {
  defaultValues?: Partial<MetadataFormValues>
  aiSuggestions?: Partial<Record<keyof MetadataFormValues, { confidence: ConfidenceLevel }>>
  onSubmit: (values: MetadataFormValues) => void | Promise<void>
  isSubmitting?: boolean
  submitLabel?: string
}

export function MetadataForm({
  defaultValues,
  aiSuggestions,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Simpan',
}: MetadataFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      documentNumber: '',
      documentDate: '',
      sender: '',
      subject: '',
      documentType: '',
      ...defaultValues,
    },
  })

  const documentTypeValue = watch('documentType')

  function FieldLabel({
    htmlFor,
    children,
    fieldKey,
  }: {
    htmlFor: string
    children: React.ReactNode
    fieldKey: keyof MetadataFormValues
  }) {
    const suggestion = aiSuggestions?.[fieldKey]
    const config = suggestion ? CONFIDENCE_CONFIG[suggestion.confidence] : null
    return (
      <div className="mb-1.5 flex items-center gap-2">
        <Label htmlFor={htmlFor}>{children}</Label>
        {config && (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <FieldLabel htmlFor="documentNumber" fieldKey="documentNumber">
          Nomor Dokumen
        </FieldLabel>
        <Input id="documentNumber" {...register('documentNumber')} />
        {errors.documentNumber && (
          <p className="mt-1 text-xs text-destructive">{errors.documentNumber.message}</p>
        )}
      </div>

      <div>
        <FieldLabel htmlFor="documentDate" fieldKey="documentDate">
          Tanggal Dokumen
        </FieldLabel>
        <input
          id="documentDate"
          type="date"
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...register('documentDate')}
        />
      </div>

      <div>
        <FieldLabel htmlFor="sender" fieldKey="sender">
          Pengirim
        </FieldLabel>
        <Input id="sender" {...register('sender')} />
      </div>

      <div>
        <FieldLabel htmlFor="subject" fieldKey="subject">
          Perihal
        </FieldLabel>
        <Input id="subject" {...register('subject')} />
        {errors.subject && (
          <p className="mt-1 text-xs text-destructive">{errors.subject.message}</p>
        )}
      </div>

      <div>
        <FieldLabel htmlFor="documentType" fieldKey="documentType">
          Jenis Dokumen
        </FieldLabel>
        <Select
          value={documentTypeValue}
          onValueChange={(val) => setValue('documentType', val ?? '', { shouldValidate: true })}
        >
          <SelectTrigger id="documentType">
            <SelectValue placeholder="Pilih jenis dokumen" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Menyimpan…' : submitLabel}
      </Button>
    </form>
  )
}
