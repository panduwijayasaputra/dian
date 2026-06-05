import 'server-only'

import { GetObjectCommand } from '@aws-sdk/client-s3'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
import type { Readable } from 'stream'
import { r2Client } from './r2'

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
    const result = await pdfParse(buffer)
    return result.text ?? ''
  } catch {
    return ''
  }
}
