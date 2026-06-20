import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  const chatSession = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { id: true },
  })

  if (!chatSession) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.chatSession.delete({ where: { id: sessionId } })

  return new NextResponse(null, { status: 204 })
}
