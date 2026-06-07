'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

type ActionResult = { success: true } | { success: false; error: string }

async function requireAdmin(): Promise<{ success: false; error: string } | null> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized.' }
  }
  return null
}

async function getAdminId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return null
  return session.user.id
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

export async function createDivision(name: string, color: string): Promise<ActionResult> {
  const denied = await requireAdmin()
  if (denied) return denied

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Nama divisi tidak boleh kosong.' }

  try {
    const created = await prisma.division.create({ data: { name: trimmed, color } })
    const adminId = await getAdminId()
    await logActivity({
      userId: adminId,
      action: 'DIVISION_CREATE',
      resourceId: created.id,
      information: `Buat divisi: ${trimmed}`,
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Nama divisi sudah digunakan.' }
  }
}

export async function updateDivision(id: string, name: string, color: string): Promise<ActionResult> {
  const denied = await requireAdmin()
  if (denied) return denied

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Nama divisi tidak boleh kosong.' }

  try {
    await prisma.division.update({ where: { id }, data: { name: trimmed, color } })
    const adminId = await getAdminId()
    await logActivity({
      userId: adminId,
      action: 'DIVISION_UPDATE',
      resourceId: id,
      information: `Update divisi: ${trimmed}`,
    })
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

  const adminId = await getAdminId()
  await logActivity({
    userId: adminId,
    action: 'DIVISION_DELETE',
    resourceId: id,
    information: `Hapus divisi`,
  })

  return { success: true }
}
