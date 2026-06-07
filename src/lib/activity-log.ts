import { prisma } from '@/lib/prisma'

interface LogParams {
  userId?: string | null
  action: string
  resourceId?: string | null
  information?: string | null
}

export async function logActivity(params: LogParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        resourceId: params.resourceId ?? null,
        information: params.information ?? null,
      },
    })
  } catch (err) {
    console.error('[activity-log] failed to write log:', err)
  }
}
