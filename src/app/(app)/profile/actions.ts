'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'

type ActionResult = { success: true } | { success: false; error: string }

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Tidak terautentikasi.' }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })
  if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return { success: false, error: 'Password lama tidak sesuai.' }

  if (newPassword.length < 8) {
    return { success: false, error: 'Password baru minimal 8 karakter.' }
  }

  const newHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  })

  await logActivity({
    userId: session.user.id,
    action: 'USER_PASSWORD_CHANGE',
    resourceId: session.user.id,
    information: 'Ganti password',
  })

  return { success: true }
}
