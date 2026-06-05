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
}

const DOCUMENT_TYPES = [
  'INCOMING_LETTER',
  'OUTGOING_LETTER',
  'DISPOSITION',
  'MEMO',
  'REPORT',
  'DECREE',
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
}

export async function extractFromPDFVision(buffer: Buffer): Promise<{
  text: string
  result: ExtractionResult
}> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  let fileId: string | null = null

  try {
    const uploaded = await client.files.create({
      file: new File([new Uint8Array(buffer)], 'document.pdf', { type: 'application/pdf' }),
      purpose: 'user_data',
    })
    fileId = uploaded.id

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_file', file_id: fileId },
            {
              type: 'input_text',
              text: `You are processing an Indonesian government document (surat dinas).
Return a JSON object with exactly two keys:
1. "text": the full readable text content of the document, preserving structure.
2. "metadata": an object with these eight keys, each having "value" and "confidence" ("high"/"medium"/"low"):
   - documentNumber: the surat number (nomor surat), or null
   - documentDate: date in YYYY-MM-DD format, or null
   - sender: the sending office/person, or null
   - receiver: the addressee (look for "Kepada Yth.", "Kepada:"), or null
   - subject: the subject/perihal, or null
   - documentType: one of INCOMING_LETTER, OUTGOING_LETTER, DISPOSITION, MEMO, REPORT, DECREE, OTHER, or null
   - urgency: one of BIASA, SEGERA, SANGAT_SEGERA, or null (look for "Sifat:")
   - security: one of BIASA, TERBATAS, RAHASIA, SANGAT_RAHASIA, or null (look for "Klasifikasi:")
Use "high" confidence when clearly stated, "medium" when inferred, "low" when guessing.`,
            },
          ],
        },
      ],
      text: { format: { type: 'json_object' } },
    })

    const raw = response.output_text
    if (!raw) return { text: '', result: FALLBACK }

    const parsed = JSON.parse(raw) as {
      text?: string
      metadata?: Record<string, { value: unknown; confidence: string }>
    }

    const metadataParsed = extractionSchema.safeParse(parsed.metadata ?? {})

    return {
      text: typeof parsed.text === 'string' ? parsed.text : '',
      result: metadataParsed.success ? (metadataParsed.data as ExtractionResult) : FALLBACK,
    }
  } catch {
    return { text: '', result: FALLBACK }
  } finally {
    if (fileId) {
      try {
        await client.files.delete(fileId)
      } catch {
        // best-effort cleanup
      }
    }
  }
}

export async function extractMetadataFromText(text: string): Promise<ExtractionResult> {
  if (!text.trim()) return FALLBACK

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You extract metadata from Indonesian government correspondence (surat dinas).
Return a JSON object with exactly eight keys: documentNumber, documentDate, sender, receiver, subject, documentType, urgency, security.
Each key must have: "value" (extracted string or null if not found) and "confidence" ("high", "medium", or "low").
- documentDate value must be in YYYY-MM-DD format if found, otherwise null.
- documentType value must be one of: INCOMING_LETTER, OUTGOING_LETTER, DISPOSITION, MEMO, REPORT, DECREE, OTHER, or null.
- receiver: the addressee of the letter (look for "Kepada Yth.", "Kepada:", "Yth."), or null.
- urgency: the sifat/urgency of the letter. Must be one of: BIASA, SEGERA, SANGAT_SEGERA, or null. Look for "Sifat:" field.
- security: the security classification. Must be one of: BIASA, TERBATAS, RAHASIA, SANGAT_RAHASIA, or null. Look for "Klasifikasi:" or stamp markings.
- Use "high" confidence when the value is clearly and explicitly stated in the text.
- Use "medium" when it can be inferred with reasonable certainty.
- Use "low" when you are guessing or the text is ambiguous.`,
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
