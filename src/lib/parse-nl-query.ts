import 'server-only'

import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type ParsedQuery = {
  document_number: string | null
  sender: string | null
  subject_keywords: string | null
  date_from: string | null
  date_to: string | null
}

const EMPTY: ParsedQuery = {
  document_number: null,
  sender: null,
  subject_keywords: null,
  date_from: null,
  date_to: null,
}

function hasAnyField(parsed: ParsedQuery): boolean {
  return !!(
    parsed.document_number ||
    parsed.sender ||
    parsed.subject_keywords ||
    parsed.date_from ||
    parsed.date_to
  )
}

export async function parseNlQuery(query: string): Promise<ParsedQuery | null> {
  if (!query.trim()) return null

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a search query parser for a government document archive system. ' +
            'Extract structured fields from the user\'s search query. ' +
            'Return a JSON object with exactly these fields (use null if not mentioned in the query):\n' +
            '- document_number: exact or partial document number (string or null)\n' +
            '- sender: name of the sending office or person (string or null)\n' +
            '- subject_keywords: key topic words, not a full sentence (string or null)\n' +
            '- date_from: start date in YYYY-MM-DD format (string or null)\n' +
            '- date_to: end date in YYYY-MM-DD format (string or null)\n' +
            'Support both Bahasa Indonesia and English queries. ' +
            'For relative dates like "tahun lalu" or "last year", resolve to absolute YYYY-MM-DD dates. ' +
            'Only extract what is explicitly mentioned — do not infer or guess.',
        },
        {
          role: 'user',
          content: query,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) return null

    const parsed = JSON.parse(raw) as Record<string, unknown>

    const result: ParsedQuery = {
      document_number: typeof parsed.document_number === 'string' ? parsed.document_number : null,
      sender: typeof parsed.sender === 'string' ? parsed.sender : null,
      subject_keywords: typeof parsed.subject_keywords === 'string' ? parsed.subject_keywords : null,
      date_from: typeof parsed.date_from === 'string' ? parsed.date_from : null,
      date_to: typeof parsed.date_to === 'string' ? parsed.date_to : null,
    }

    return hasAnyField(result) ? result : null
  } catch {
    return null
  }
}

export { EMPTY as EMPTY_PARSED_QUERY }
