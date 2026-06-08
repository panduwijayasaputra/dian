'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export interface ChatMessageData {
  id: string
  role: string
  content: string
  sources: unknown
  createdAt: Date
}

export async function getChatMessages(sessionId: string): Promise<ChatMessageData[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const chatSession = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!chatSession) return []

  return prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, content: true, sources: true, createdAt: true },
  })
}
