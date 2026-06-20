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

export interface DocumentExtractionResult {
  metadata: ExtractionResult
  summary: string | null
  extractedText: string
}

const DOCUMENT_TYPES = ['INCOMING_LETTER', 'OUTGOING_LETTER', 'SPT', 'NOTA_DINAS', 'OTHER'] as const
const URGENCY_LEVELS = ['BIASA', 'SEGERA', 'SANGAT_SEGERA'] as const
const SECURITY_LEVELS = ['BIASA', 'TERBATAS', 'RAHASIA', 'SANGAT_RAHASIA'] as const

const fieldSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema.nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  })

const schema = z.object({
  metadata: z.object({
    documentNumber: fieldSchema(z.string()),
    documentDate: fieldSchema(z.string()),
    sender: fieldSchema(z.string()),
    receiver: fieldSchema(z.string()),
    subject: fieldSchema(z.string()),
    documentType: fieldSchema(z.enum(DOCUMENT_TYPES)),
    urgency: fieldSchema(z.enum(URGENCY_LEVELS)),
    security: fieldSchema(z.enum(SECURITY_LEVELS)),
    deadlineStart: fieldSchema(z.string()),
    deadlineEnd: fieldSchema(z.string()),
    memo: fieldSchema(z.string()),
  }),
  summary: z.string().nullable(),
  extractedText: z.string(),
})

const FALLBACK: DocumentExtractionResult = {
  metadata: {
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
  },
  summary: null,
  extractedText: '',
}

function buildSystemPrompt(orgName: string): string {
  return `Kamu adalah sistem ekstraksi dokumen surat dinas pemerintah Indonesia.

Baca dokumen yang diberikan dan kembalikan JSON dengan tepat tiga kunci: "metadata", "summary", "extractedText".

=== metadata ===
Objek dengan sebelas kunci: documentNumber, documentDate, sender, receiver, subject, documentType, urgency, security, deadlineStart, deadlineEnd, memo.
Setiap kunci memiliki: "value" (string atau null jika tidak ditemukan) dan "confidence" ("high", "medium", atau "low").

Prinsip: selalu gunakan nama/jabatan/instansi LENGKAP persis seperti tertulis. Jangan singkat atau parafrase.
- documentDate: format YYYY-MM-DD atau null.
- documentType: INCOMING_LETTER, OUTGOING_LETTER, SPT, NOTA_DINAS, OTHER, atau null.
  - INCOMING_LETTER: surat masuk${orgName ? ` (penerima adalah "${orgName}" atau unit di bawahnya)` : ' (surat yang diterima dari pihak luar)'}
  - OUTGOING_LETTER: surat keluar${orgName ? ` (pengirim adalah "${orgName}" atau unit di bawahnya)` : ' (surat yang dikirim ke pihak luar)'}
  - SPT: Surat Perintah Tugas (tugas perjalanan dinas atau penugasan)
  - NOTA_DINAS: memo internal antar unit dalam satu organisasi
  - OTHER: jenis lain yang tidak termasuk di atas
- receiver: penerima surat (cari "Kepada Yth.", "Kepada:", "Yth."), atau null.
- urgency: BIASA, SEGERA, SANGAT_SEGERA, atau null. Cari field "Sifat:".
- security: BIASA, TERBATAS, RAHASIA, SANGAT_RAHASIA, atau null. Cari "Klasifikasi:" atau cap/stempel.
- deadlineStart: tanggal mulai batas waktu atau pelaksanaan kegiatan, format YYYY-MM-DD, atau null.
- deadlineEnd: tanggal selesai batas waktu atau akhir kegiatan, format YYYY-MM-DD, atau null. Jika hanya satu tanggal, samakan dengan deadlineStart.
- memo: jika ada undangan atau acara, tulis sebagai kalimat pemberitahuan alami berbahasa Indonesia (bukan daftar). Sertakan hanya informasi yang eksplisit: penyelenggara, hari/tanggal, waktu, tempat, peserta, persyaratan. Jika rentang tanggal, tulis lengkap. Jika tidak ada undangan/acara, null.

Tingkat kepercayaan:
- "high": nilai dinyatakan secara eksplisit dan jelas.
- "medium": dapat disimpulkan dengan keyakinan wajar.
- "low": perkiraan atau teks ambigu.

=== summary ===
2-3 kalimat abstrak netral tentang isi utama dokumen. Gunakan bahasa yang sama dengan dokumen. Null jika tidak ada konten bermakna.

=== extractedText ===
Transkripsi lengkap seluruh teks yang terlihat dalam dokumen, persis seperti aslinya termasuk formatting dan tanda baca.`
}

export async function extractDocument(buffer: Buffer): Promise<DocumentExtractionResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const orgName = process.env.ORGANISATION_NAME ?? ''

  let fileId: string | null = null
  try {
    const uploaded = await client.files.create({
      file: new File([new Uint8Array(buffer)], 'document.pdf', { type: 'application/pdf' }),
      purpose: 'user_data',
    })
    fileId = uploaded.id

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(orgName),
        },
        {
          role: 'user',
          content: [
            {
              type: 'file',
              file: { file_id: fileId },
            },
          ],
        },
      ],
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) return FALLBACK

    const parsed = schema.safeParse(JSON.parse(raw))
    if (!parsed.success) return FALLBACK

    return parsed.data as DocumentExtractionResult
  } catch {
    return FALLBACK
  } finally {
    if (fileId) {
      await client.files.delete(fileId).catch(() => {})
    }
  }
}
