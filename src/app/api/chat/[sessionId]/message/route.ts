import { auth } from '@/auth'
import { generateEmbedding } from '@/lib/generate-embeddings'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ChunkRow {
  id: string
  content: string
  chunkIndex: number
  documentId: string
  documentNumber: string | null
  subject: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params
  const body = await request.json()
  const content: string = String(body.content ?? '').trim()
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const chatSession = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!chatSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Save user message
  await prisma.chatMessage.create({
    data: { sessionId, role: 'user', content },
  })
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  })

  // Embed query and vector search
  let chunks: ChunkRow[] = []
  const embedding = await generateEmbedding(content)
  if (embedding) {
    const vectorStr = `[${embedding.join(',')}]`
    chunks = await prisma.$queryRaw<ChunkRow[]>(
      Prisma.sql`
        SELECT dc.id, dc.content, dc."chunkIndex",
               d.id AS "documentId", d."documentNumber", d.subject,
               dc.embedding <=> ${vectorStr}::vector AS distance
        FROM "DocumentChunk" dc
        JOIN "Document" d ON d.id = dc."documentId"
        WHERE dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> ${vectorStr}::vector
        LIMIT 5
      `
    )
  }

  // Build system prompt
  const contextBlock =
    chunks.length > 0
      ? chunks
          .map(
            (c, i) =>
              `[${i + 1}] Nomor: ${c.documentNumber ?? '-'}, Perihal: ${c.subject ?? '-'}\nIsi: ${c.content}`
          )
          .join('\n\n')
      : null

  const systemPrompt = contextBlock
    ? `Kamu adalah DIAN, asisten dokumen pemerintah. Jawab pertanyaan berdasarkan dokumen berikut saja.\nJika jawaban tidak ada dalam dokumen, katakan dengan jelas bahwa kamu tidak menemukan dokumen yang relevan.\n\nKonteks dokumen:\n${contextBlock}`
    : `Kamu adalah DIAN, asisten dokumen pemerintah. Tidak ditemukan dokumen yang relevan untuk pertanyaan ini. Sampaikan hal tersebut dengan sopan kepada pengguna.`

  // Fetch prior messages for context
  const priorMessages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  })

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...priorMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  // Stream OpenAI response
  const sources = chunks.map((c) => ({
    documentId: c.documentId,
    documentNumber: c.documentNumber,
    subject: c.subject,
    excerpt: c.content.slice(0, 200),
  }))

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let fullText = ''

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          stream: true,
          messages,
        })

        for await (const chunk of completion) {
          const token = chunk.choices[0]?.delta?.content ?? ''
          if (token) {
            fullText += token
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(token)}\n\n`))
          }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        controller.close()
      } catch {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
        )
        controller.close()
      }

      // Save assistant message after stream (fire-and-forget)
      prisma.chatMessage
        .create({
          data: {
            sessionId,
            role: 'assistant',
            content: fullText,
            sources: sources.length > 0 ? sources : Prisma.JsonNull,
          },
        })
        .then(() =>
          prisma.chatSession.update({
            where: { id: sessionId },
            data: { updatedAt: new Date() },
          })
        )
        .catch((err) => console.error('[chat] Failed to save assistant message:', err))
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
