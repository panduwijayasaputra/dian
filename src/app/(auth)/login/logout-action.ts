'use server'

import { auth, signOut } from '@/auth'
import { logActivity } from '@/lib/activity-log'

export async function logoutAction() {
  const session = await auth()
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      action: 'AUTH_LOGOUT',
      resourceId: session.user.id,
      information: `Logout: ${session.user.name}`,
    })
  }
  await signOut({ redirectTo: '/login' })
}
