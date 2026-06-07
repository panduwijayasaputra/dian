'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { uploadToR2 } from '@/lib/r2'
import { logActivity } from '@/lib/activity-log'

const MAX_SIZE_BYTES = 20 * 1024 * 1024

type UploadResult =
  | { success: true; documentId: string }
  | { success: false; error: string }

export async function uploadDocument(formData: FormData): Promise<UploadResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return { success: false, error: 'No file provided.' }
  }

  if (file.type !== 'application/pdf') {
    return { success: false, error: 'Only PDF files are accepted.' }
  }

  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, error: 'File exceeds the 20 MB limit.' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = `documents/${session.user.id}/${crypto.randomUUID()}.pdf`

  await uploadToR2(key, buffer, 'application/pdf')

  const document = await prisma.document.create({
    data: {
      userId: session.user.id,
      r2Key: key,
      status: 'PROCESSING',
      originalName: file.name,
      fileSizeBytes: file.size,
    },
  })

  await logActivity({
    userId: session.user.id,
    action: 'DOCUMENT_UPLOAD',
    resourceId: document.id,
    information: `Unggah: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`,
  })

  return { success: true, documentId: document.id }
}
