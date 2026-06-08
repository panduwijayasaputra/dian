import 'server-only'

import OpenAI from 'openai'
import { z } from 'zod'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ExtractionField {
  value: string | null
  confidence: ConfidenceLevel
}

export interface ExtractionResult {
  documentNumber: ExtractionField
  documentDate: ExtractionField
  sender: ExtractionField
  receiver: ExtractionField
  subject: ExtractionField
  documentType: ExtractionField
  urgency: ExtractionField
  security: ExtractionField
  deadlineStart: ExtractionField
  deadlineEnd: ExtractionField
  memo: ExtractionField
}

const DOCUMENT_TYPES = [
  'INCOMING_LETTER',
  'OUTGOING_LETTER',
  'SPT',
  'NOTA_DINAS',
  'OTHER',
] as const

const URGENCY_LEVELS = ['BIASA', 'SEGERA', 'SANGAT_SEGERA'] as const
const SECURITY_LEVELS = ['BIASA', 'TERBATAS', 'RAHASIA', 'SANGAT_RAHASIA'] as const

const extractionSchema = z.object({
  documentNumber: z.object({
    value: z.string().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  documentDate: z.object({
    value: z.string().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  sender: z.object({
    value: z.string().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  receiver: z.object({
    value: z.string().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  subject: z.object({
    value: z.string().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  documentType: z.object({
    value: z.enum(DOCUMENT_TYPES).nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  urgency: z.object({
    value: z.enum(URGENCY_LEVELS).nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  security: z.object({
    value: z.enum(SECURITY_LEVELS).nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  deadlineStart: z.object({
    value: z.string().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  deadlineEnd: z.object({
    value: z.string().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  memo: z.object({
    value: z.string().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
})

const FALLBACK: ExtractionResult = {
  documentNumber: { value: null, confidence: 'low' },
  documentDate: { value: null, confidence: 'low' },
  sender: { value: null, confidence: 'low' },
  receiver: { value: null, confidence: 'low' },
  subject: { value: null, confidence: 'low' },
  documentType: { value: null, confidence: 'low' },
  urgency: { value: null, confidence: 'low' },
  security: { value: null, confidence: 'low' },
  deadlineStart: { value: null, confidence: 'low' },
  deadlineEnd: { value: null, confidence: 'low' },
  memo: { value: null, confidence: 'low' },
}

export async function extractMetadataFromText(text: string): Promise<ExtractionResult> {
  if (!text.trim()) return FALLBACK

  const orgName = process.env.ORGANISATION_NAME ?? ''

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Kamu adalah sistem ekstraksi metadata dari surat dinas pemerintah Indonesia.
Kembalikan JSON dengan tepat sebelas kunci: documentNumber, documentDate, sender, receiver, subject, documentType, urgency, security, deadlineStart, deadlineEnd, memo.
Setiap kunci harus memiliki: "value" (string yang diekstrak atau null jika tidak ditemukan) dan "confidence" ("high", "medium", atau "low").

Prinsip umum: selalu gunakan nama/jabatan/instansi LENGKAP persis seperti yang tertulis dalam dokumen. Jangan singkat atau parafrase — misalnya tulis "Kepala Balai Pemantapan Kawasan Hutan Wilayah XII Tanjungpinang" bukan hanya "Kepala Balai".

Aturan per field:
- documentDate: format YYYY-MM-DD jika ada, jika tidak null.
- documentType: salah satu dari INCOMING_LETTER, OUTGOING_LETTER, SPT, NOTA_DINAS, OTHER, atau null.
  - INCOMING_LETTER: surat masuk${orgName ? ` (penerima adalah "${orgName}" atau unit di bawahnya)` : ' (surat yang diterima dari pihak luar)'}
  - OUTGOING_LETTER: surat keluar${orgName ? ` (pengirim adalah "${orgName}" atau unit di bawahnya)` : ' (surat yang dikirim ke pihak luar)'}
  - SPT: Surat Perintah Tugas (tugas perjalanan dinas atau penugasan)
  - NOTA_DINAS: memo internal antar unit dalam satu organisasi
  - OTHER: jenis lain yang tidak termasuk di atas
- receiver: penerima surat (cari "Kepada Yth.", "Kepada:", "Yth."), atau null.
- urgency: sifat surat. Salah satu: BIASA, SEGERA, SANGAT_SEGERA, atau null. Cari field "Sifat:".
- security: klasifikasi keamanan. Salah satu: BIASA, TERBATAS, RAHASIA, SANGAT_RAHASIA, atau null. Cari "Klasifikasi:" atau cap/stempel.
- deadlineStart: tanggal mulai batas waktu atau tanggal pelaksanaan kegiatan, format YYYY-MM-DD, atau null.
- deadlineEnd: tanggal selesai batas waktu atau tanggal akhir kegiatan, format YYYY-MM-DD, atau null. Jika hanya ada satu tanggal, samakan dengan deadlineStart.
- memo: jika dokumen berisi undangan atau acara, tulis sebagai kalimat pengumuman alami berbahasa Indonesia yang siap disalin dan diteruskan kepada pihak yang bersangkutan. Sertakan HANYA informasi yang secara eksplisit tercantum dalam dokumen dari aspek berikut: penyelenggara, hari/tanggal, waktu, tempat atau tautan virtual, jumlah dan kualifikasi peserta, hal penting/persyaratan, dan tautan pendaftaran. Rangkai semua aspek yang tersedia menjadi satu atau dua kalimat pemberitahuan yang mengalir — bukan daftar. PENTING: jika dokumen menyebutkan rentang tanggal (contoh: "06 s/d 07 Juni 2026", "6–7 Juni", "tanggal 6 sampai dengan 7"), tulis rentang lengkap tersebut di memo, jangan hanya tanggal awal. Jika tidak ada undangan atau acara sama sekali, nilai null.

Tingkat kepercayaan:
- "high": nilai dinyatakan secara eksplisit dan jelas dalam teks.
- "medium": dapat disimpulkan dengan keyakinan wajar.
- "low": perkiraan atau teks ambigu.`,
        },
        {
          role: 'user',
          content: text.slice(0, 3000),
        },
      ],
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) return FALLBACK

    const parsed = extractionSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return FALLBACK

    return parsed.data as ExtractionResult
  } catch {
    return FALLBACK
  }
}
