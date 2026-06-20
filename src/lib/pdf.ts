import 'server-only'

import { GetObjectCommand } from '@aws-sdk/client-s3'
import type { Readable } from 'stream'
import { r2Client } from './r2'

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
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
