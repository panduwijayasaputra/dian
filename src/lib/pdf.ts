import 'server-only'

import { GetObjectCommand } from '@aws-sdk/client-s3'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
import type { Readable } from 'stream'
import { r2Client } from './r2'

export function isGarbled(text: string): boolean {
  if (!text || text.length < 50) return true
  const readable = (text.match(/[\p{L}\p{N}\s.,\-()/:"'!?]/gu) ?? []).length
  if (readable / text.length < 0.5) return true
  // High + density is a ToUnicode mapping failure artifact in garbled Indonesian PDFs
  const plusDensity = (text.match(/\+/g) ?? []).length / text.length
  if (plusDensity > 0.01) return true
  // High % density is another BSrE encoding artifact (dilutes + density in whitespace-heavy output)
  const percentDensity = (text.match(/%/g) ?? []).length / text.length
  return percentDensity > 0.015
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function extractTextFromR2(r2Key: string): Promise<string> {
  try {
    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: r2Key,
      }),
    )

    if (!response.Body) return ''

    const buffer = await streamToBuffer(response.Body as Readable)
    const warn = console.warn
    console.warn = () => {}
    const result = await pdfParse(buffer)
    console.warn = warn
    return result.text ?? ''
  } catch {
    return ''
  }
}

export async function getBufferFromR2(r2Key: string): Promise<Buffer | null> {
  try {
    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: r2Key,
      }),
    )
    if (!response.Body) return null
    return streamToBuffer(response.Body as Readable)
  } catch {
    return null
  }
}

export async function renderPDFPagesToImages(buffer: Buffer, maxPages = 4): Promise<string[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as any
    // pdfjs v6 removed pdf.worker.mjs from legacy/build; reference the standard build worker.
    // process.cwd() reliably returns the project root in Next.js server actions.
    pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${process.cwd()}/node_modules/pdfjs-dist/build/pdf.worker.mjs`
    const { createCanvas, Image } = await import('canvas')
    // pdfjs uses `new Image()` internally when rendering PDFs with inline images.
    // In Node.js, Image is not a global — set it so pdfjs creates canvas-compatible Image objects.
    const g = globalThis as Record<string, unknown>
    if (!g.Image) g.Image = Image

    const data = new Uint8Array(buffer)
    const pdf = await pdfjsLib.getDocument({ data, verbosity: 0 }).promise
    const numPages = Math.min(pdf.numPages, maxPages)
    const images: string[] = []

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 2.0 })
      const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height))
      const canvasContext = canvas.getContext('2d')

      await page.render({
        canvasContext: canvasContext as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise

      images.push(canvas.toBuffer('image/png').toString('base64'))
      page.cleanup()
    }

    await pdf.cleanup()
    return images
  } catch (err) {
    console.error('[pdf] renderPDFPagesToImages failed:', err)
    return []
  }
}
