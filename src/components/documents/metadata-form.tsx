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
import type { ConfidenceLevel } from '@/lib/extract-document'
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
  deadlineStart: string
  deadlineEnd: string
  memo: string
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
  deadlineStart: z.string(),
  deadlineEnd: z.string(),
  memo: z.string(),
  divisionIds: z.array(z.string()).optional(),
})

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'INCOMING_LETTER', label: 'Surat Masuk' },
  { value: 'OUTGOING_LETTER', label: 'Surat Keluar' },
  { value: 'SPT', label: 'SPT' },
  { value: 'NOTA_DINAS', label: 'Nota Dinas' },
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
      deadlineStart: '',
      deadlineEnd: '',
      memo: '',
      divisionIds: [],
      ...defaultValues,
    },
  })

  const documentTypeValue = watch('documentType')
  const urgencyValue = watch('urgency')
  const securityValue = watch('security')
  const divisionIds = watch('divisionIds') ?? []
  const memoValue = watch('memo')

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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor="deadlineStart" fieldKey="deadlineStart">
            Batas Waktu Mulai
          </FieldLabel>
          <input
            id="deadlineStart"
            type="date"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('deadlineStart')}
          />
        </div>
        <div>
          <FieldLabel htmlFor="deadlineEnd" fieldKey="deadlineEnd">
            Batas Waktu Selesai
          </FieldLabel>
          <input
            id="deadlineEnd"
            type="date"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('deadlineEnd')}
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="memo" fieldKey="memo">
          Catatan Acara / Undangan
        </FieldLabel>
        <textarea
          id="memo"
          rows={3}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          placeholder="Contoh: PT. XXXX mengundang untuk menghadiri Seminar XXXXXX pada Senin, 15 Juni 2026 pukul 09.00–12.00 WIB di Hotel YYYY, Jakarta. Kuota 30 orang (Tenaga Teknis). Pendaftaran melalui bit.ly/xxxx."
          {...register('memo')}
        />
        {/* {process.env.NEXT_PUBLIC_WA_NUMBER && memoValue?.trim() && (
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}?text=${encodeURIComponent(memoValue.trim())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Kirim ke WhatsApp
          </a>
        )} */}
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
