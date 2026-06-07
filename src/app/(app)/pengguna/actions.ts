'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
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

export async function getUsers() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return []

  return prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isActive: true,
      divisionId: true,
      division: { select: { id: true, name: true } },
    },
  })
}

type CreateUserInput = {
  name: string
  username: string
  password: string
  role: 'ADMIN' | 'USER'
  divisionId: string | null
}

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  const denied = await requireAdmin()
  if (denied) return denied

  const { name, username, password, role, divisionId } = input

  if (!name.trim() || !username.trim() || !password) {
    return { success: false, error: 'Semua field wajib diisi.' }
  }
  if (role === 'USER' && !divisionId) {
    return { success: false, error: 'Pengguna harus memiliki divisi.' }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const createdUser = await prisma.user.create({
      data: {
        name: name.trim(),
        username: username.trim(),
        passwordHash,
        role,
        divisionId: role === 'USER' ? divisionId : null,
        isActive: true,
      },
    })
    const adminId = await getAdminId()
    await logActivity({
      userId: adminId,
      action: 'USER_CREATE',
      resourceId: createdUser.id,
      information: `Buat pengguna: ${name.trim()} (${username.trim()})`,
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Username sudah digunakan.' }
  }
}

type UpdateUserInput = {
  name: string
  username: string
  role: 'ADMIN' | 'USER'
  divisionId: string | null
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<ActionResult> {
  const denied = await requireAdmin()
  if (denied) return denied

  const { name, username, role, divisionId } = input

  if (!name.trim() || !username.trim()) {
    return { success: false, error: 'Nama dan username wajib diisi.' }
  }
  if (role === 'USER' && !divisionId) {
    return { success: false, error: 'Pengguna harus memiliki divisi.' }
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name: name.trim(),
        username: username.trim(),
        role,
        divisionId: role === 'USER' ? divisionId : null,
      },
    })
    const adminId = await getAdminId()
    await logActivity({
      userId: adminId,
      action: 'USER_UPDATE',
      resourceId: id,
      information: `Update pengguna: ${name.trim()} (${username.trim()})`,
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Username sudah digunakan.' }
  }
}

export async function toggleUserActive(id: string): Promise<ActionResult> {
  const denied = await requireAdmin()
  if (denied) return denied

  const user = await prisma.user.findUnique({ where: { id }, select: { isActive: true } })
  if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' }

  await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } })

  const adminId = await getAdminId()
  await logActivity({
    userId: adminId,
    action: user.isActive ? 'USER_DEACTIVATE' : 'USER_ACTIVATE',
    resourceId: id,
    information: `${user.isActive ? 'Nonaktifkan' : 'Aktifkan'} pengguna`,
  })

  return { success: true }
}
