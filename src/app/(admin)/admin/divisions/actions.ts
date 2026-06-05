'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

type ActionResult = { success: true } | { success: false; error: string }

async function requireAdmin(): Promise<{ success: false; error: string } | null> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized.' }
  }
  return null
}

export async function getDivisions() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return []

  return prisma.division.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { users: true, documentDivisions: true },
      },
    },
  })
}

export async function createDivision(name: string): Promise<ActionResult> {
  const denied = await requireAdmin()
  if (denied) return denied

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Nama divisi tidak boleh kosong.' }

  try {
    await prisma.division.create({ data: { name: trimmed } })
    return { success: true }
  } catch {
    return { success: false, error: 'Nama divisi sudah digunakan.' }
  }
}

export async function updateDivision(id: string, name: string): Promise<ActionResult> {
  const denied = await requireAdmin()
  if (denied) return denied

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Nama divisi tidak boleh kosong.' }

  try {
    await prisma.division.update({ where: { id }, data: { name: trimmed } })
    return { success: true }
  } catch {
    return { success: false, error: 'Nama divisi sudah digunakan.' }
  }
}

export async function deleteDivision(id: string): Promise<ActionResult> {
  const denied = await requireAdmin()
  if (denied) return denied

  const userCount = await prisma.user.count({ where: { divisionId: id } })
  const docCount = await prisma.documentDivision.count({ where: { divisionId: id } })

  if (userCount > 0 || docCount > 0) {
    return {
      success: false,
      error: 'Divisi tidak dapat dihapus karena masih memiliki pengguna atau dokumen.',
    }
  }

  await prisma.division.delete({ where: { id } })
  return { success: true }
}
