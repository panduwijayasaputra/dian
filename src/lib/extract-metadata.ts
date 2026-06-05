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
  subject: ExtractionField
  documentType: ExtractionField
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
  subject: z.object({
    value: z.string().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  documentType: z.object({
    value: z.enum(DOCUMENT_TYPES).nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
})

const FALLBACK: ExtractionResult = {
  documentNumber: { value: null, confidence: 'low' },
  documentDate: { value: null, confidence: 'low' },
  sender: { value: null, confidence: 'low' },
  subject: { value: null, confidence: 'low' },
  documentType: { value: null, confidence: 'low' },
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
Return a JSON object with exactly five keys: documentNumber, documentDate, sender, subject, documentType.
Each key must have: "value" (extracted string or null if not found) and "confidence" ("high", "medium", or "low").
- documentDate value must be in YYYY-MM-DD format if found, otherwise null.
- documentType value must be one of: INCOMING_LETTER, OUTGOING_LETTER, DISPOSITION, MEMO, REPORT, DECREE, OTHER, or null.
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
