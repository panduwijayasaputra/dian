import 'server-only'

import { execFile } from 'child_process'
import { mkdir, readdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import { GetObjectCommand } from '@aws-sdk/client-s3'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
import type { Readable } from 'stream'
import { r2Client } from './r2'
import { randomUUID } from 'crypto'

const execFileAsync = promisify(execFile)

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

// Renders PDF pages to images via pdftoppm and runs tesseract OCR.
// Used as a fallback when primary text extraction is garbled.
// Requires: poppler-utils (pdftoppm) and tesseract-ocr with ind+eng language packs.
// On Ubuntu: apt-get install poppler-utils tesseract-ocr tesseract-ocr-ind
// On macOS:  brew install poppler tesseract tesseract-lang
export async function extractTextViaOCR(buffer: Buffer, maxPages = 4): Promise<string> {
  const workDir = join(tmpdir(), `dian-ocr-${randomUUID()}`)
  try {
    await mkdir(workDir, { recursive: true })

    const pdfPath = join(workDir, 'input.pdf')
    await writeFile(pdfPath, buffer)

    // Render up to maxPages pages as PNG images at 150 DPI (sufficient for OCR accuracy)
    const imagePrefix = join(workDir, 'page')
    await execFileAsync('pdftoppm', ['-r', '150', '-png', '-l', String(maxPages), pdfPath, imagePrefix])

    const files = await readdir(workDir)
    const pageFiles = files.filter((f) => f.startsWith('page') && f.endsWith('.png')).sort()
    if (pageFiles.length === 0) return ''

    const texts: string[] = []
    for (const pageFile of pageFiles) {
      try {
        const { stdout } = await execFileAsync('tesseract', [
          join(workDir, pageFile),
          'stdout',
          '-l', 'ind+eng',
        ])
        if (stdout.trim()) texts.push(stdout.trim())
      } catch {
        // Skip pages where OCR fails; continue with remaining pages
      }
    }

    return texts.join('\n\n')
  } catch (err) {
    console.error('[ocr] extractTextViaOCR failed:', err)
    return ''
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}
