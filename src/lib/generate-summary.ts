import 'server-only'

import OpenAI from 'openai'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateSummary(text: string): Promise<string | null> {
  if (!text.trim()) return null

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a document summarizer for government correspondence. ' +
            'Write a factual, neutral 2–3 sentence abstract of the document\'s main content. ' +
            'Use the same language as the document. Do not add opinions or recommendations.',
        },
        {
          role: 'user',
          content: text.slice(0, 8000),
        },
      ],
    })

    return response.choices[0]?.message?.content?.trim() ?? null
  } catch {
    return null
  }
}
