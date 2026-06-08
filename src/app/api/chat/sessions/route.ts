import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  })

  return NextResponse.json({ sessions })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const title = String(body.title ?? '').slice(0, 60) || 'Percakapan baru'

  const chatSession = await prisma.chatSession.create({
    data: { userId: session.user.id, title },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  })

  return NextResponse.json({ session: chatSession }, { status: 201 })
}
