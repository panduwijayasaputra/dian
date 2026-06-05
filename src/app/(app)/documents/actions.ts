'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getPresignedUrl } from '@/lib/r2'

type ViewUrlResult =
  | { success: true; url: string }
  | { success: false; error: string }

export async function getDocumentViewUrl(documentId: string): Promise<ViewUrlResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated.' }
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  })

  if (!document || document.userId !== session.user.id) {
    return { success: false, error: 'Document not found.' }
  }

  if (!document.r2Key || document.status === 'LOCAL') {
    return { success: false, error: 'Document not available yet.' }
  }

  const url = await getPresignedUrl(document.r2Key)
  return { success: true, url }
}
