'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import type { ConfidenceLevel } from '@/lib/extract-metadata'
import { DivisionSelect } from './division-select'

type Division = { id: string; name: string }

export interface MetadataFormValues {
  documentNumber: string
  documentDate: string
  sender: string
  receiver: string
  subject: string
  documentType: string
  urgency: string
  security: string
  deadline: string
  divisionIds?: string[]
}

const metadataSchema = z.object({
  documentNumber: z.string().min(1, 'Nomor dokumen wajib diisi'),
  documentDate: z.string(),
  sender: z.string(),
  receiver: z.string(),
  subject: z.string().min(1, 'Perihal wajib diisi'),
  documentType: z.string(),
  urgency: z.string(),
  security: z.string(),
  deadline: z.string(),
  divisionIds: z.array(z.string()).optional(),
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

const URGENCY_OPTIONS = [
  { value: 'BIASA', label: 'Biasa' },
  { value: 'SEGERA', label: 'Segera' },
  { value: 'SANGAT_SEGERA', label: 'Sangat Segera' },
]

const SECURITY_OPTIONS = [
  { value: 'BIASA', label: 'Biasa' },
  { value: 'TERBATAS', label: 'Terbatas' },
  { value: 'RAHASIA', label: 'Rahasia' },
  { value: 'SANGAT_RAHASIA', label: 'Sangat Rahasia' },
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
  onDirtyChange?: (dirty: boolean) => void
  isSubmitting?: boolean
  disabled?: boolean
  submitLabel?: string
  divisions?: Division[]
}

export function MetadataForm({
  defaultValues,
  aiSuggestions,
  onSubmit,
  onDirtyChange,
  isSubmitting = false,
  disabled = false,
  submitLabel = 'Simpan',
  divisions,
}: MetadataFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      documentNumber: '',
      documentDate: '',
      sender: '',
      receiver: '',
      subject: '',
      documentType: '',
      urgency: '',
      security: '',
      deadline: '',
      divisionIds: [],
      ...defaultValues,
    },
  })

  const documentTypeValue = watch('documentType')
  const urgencyValue = watch('urgency')
  const securityValue = watch('security')
  const divisionIds = watch('divisionIds') ?? []

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

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
    <form onSubmit={handleSubmit(onSubmit)}>
    <fieldset disabled={disabled} className="space-y-4 border-0 p-0 m-0 min-w-0">
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
        <FieldLabel htmlFor="receiver" fieldKey="receiver">
          Penerima
        </FieldLabel>
        <Input id="receiver" {...register('receiver')} />
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
            <span className={cn('flex flex-1 text-left text-sm', !documentTypeValue && 'text-muted-foreground/70')}>
              {DOCUMENT_TYPE_OPTIONS.find((o) => o.value === documentTypeValue)?.label ?? 'Pilih jenis dokumen'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <FieldLabel htmlFor="urgency" fieldKey="urgency">
          Sifat
        </FieldLabel>
        <Select
          value={urgencyValue}
          onValueChange={(val) => setValue('urgency', val ?? '', { shouldValidate: true })}
        >
          <SelectTrigger id="urgency">
            <span className={cn('flex flex-1 text-left text-sm', !urgencyValue && 'text-muted-foreground/70')}>
              {URGENCY_OPTIONS.find((o) => o.value === urgencyValue)?.label ?? 'Pilih sifat'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {URGENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <FieldLabel htmlFor="security" fieldKey="security">
          Klasifikasi
        </FieldLabel>
        <Select
          value={securityValue}
          onValueChange={(val) => setValue('security', val ?? '', { shouldValidate: true })}
        >
          <SelectTrigger id="security">
            <span className={cn('flex flex-1 text-left text-sm', !securityValue && 'text-muted-foreground/70')}>
              {SECURITY_OPTIONS.find((o) => o.value === securityValue)?.label ?? 'Pilih klasifikasi'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {SECURITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <FieldLabel htmlFor="deadline" fieldKey="deadline">
          Batas Waktu
        </FieldLabel>
        <input
          id="deadline"
          type="date"
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          {...register('deadline')}
        />
      </div>

      {divisions && (
        <div>
          <Label className="mb-1.5 block">Divisi</Label>
          <DivisionSelect
            value={divisionIds}
            onChange={(ids) => setValue('divisionIds', ids)}
            divisions={divisions}
            disabled={isSubmitting}
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Menyimpan…' : submitLabel}
      </Button>
    </fieldset>
    </form>
  )
}
