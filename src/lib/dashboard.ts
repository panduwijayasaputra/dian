import 'server-only'
import { prisma } from '@/lib/prisma'
import { DocumentStatus, DocumentType } from '@/generated/prisma/enums'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export type TrendDataPoint = {
  date: string
  count: number
}

export type TypeBreakdownItem = {
  type: string | null
  label: string
  count: number
}

export type RecentDocument = {
  id: string
  documentNumber: string | null
  subject: string | null
  documentDate: Date | null
  extractionStatus: string
  divisions: string[]
}

export type AdminDashboardStats = {
  role: 'ADMIN'
  totalDocs: number
  docsThisMonth: number
  docsLastMonth: number
  activeDivisions: number
  totalDivisions: number
  activeUsers: number
  totalUsers: number
  trendData: TrendDataPoint[]
  typeBreakdown: TypeBreakdownItem[]
  recentDocs: RecentDocument[]
}

export type UserDashboardStats = {
  role: 'USER'
  noDivision: boolean
  divisionTotalDocs: number
  divisionMonthDocs: number
  divisionLastMonthDocs: number
  mySearchCount: number
  mySearchLastMonth: number
  trendData: TrendDataPoint[]
  recentDocs: RecentDocument[]
}

export type DashboardStats = AdminDashboardStats | UserDashboardStats

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  [DocumentType.INCOMING_LETTER]: 'Surat Masuk',
  [DocumentType.OUTGOING_LETTER]: 'Surat Keluar',
  [DocumentType.DISPOSITION]: 'Disposisi',
  [DocumentType.MEMO]: 'Memo',
  [DocumentType.REPORT]: 'Laporan',
  [DocumentType.DECREE]: 'SK',
  [DocumentType.NOTA_DINAS]: 'Nota Dinas',
  [DocumentType.SPT]: 'SPT',
  [DocumentType.OTHER]: 'Lainnya',
}

function fillMissingDates(
  rows: { date: string; count: number }[],
  days: number,
): TrendDataPoint[] {
  const map = new Map(rows.map((r) => [r.date, r.count]))
  const result: TrendDataPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(new Date(), i)
    const key = format(d, 'yyyy-MM-dd')
    result.push({ date: format(d, 'd MMM'), count: map.get(key) ?? 0 })
  }
  return result
}

async function getAdminStats(): Promise<AdminDashboardStats> {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))
  const thirtyDaysAgo = subDays(now, 30)

  const [
    totalDocs,
    docsThisMonth,
    docsLastMonth,
    activeDivisionRows,
    totalDivisions,
    activeUsers,
    totalUsers,
    rawTrend,
    typeGroups,
    recentRaw,
  ] = await Promise.all([
    prisma.document.count({ where: { status: DocumentStatus.READY } }),

    prisma.document.count({
      where: { status: DocumentStatus.READY, createdAt: { gte: thisMonthStart } },
    }),

    prisma.document.count({
      where: {
        status: DocumentStatus.READY,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),

    prisma.documentDivision.findMany({
      where: { document: { status: DocumentStatus.READY } },
      select: { divisionId: true },
      distinct: ['divisionId'],
    }),

    prisma.division.count(),

    prisma.user.count({ where: { isActive: true } }),

    prisma.user.count(),

    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Document"
      WHERE status = ${DocumentStatus.READY}
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,

    prisma.document.groupBy({
      by: ['documentType'],
      where: { status: DocumentStatus.READY },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

    prisma.document.findMany({
      where: { status: DocumentStatus.READY },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { divisions: { include: { division: true } } },
    }),
  ])

  const trendRows = rawTrend.map((r) => ({
    date: format(new Date(r.date), 'yyyy-MM-dd'),
    count: Number(r.count),
  }))

  const typeBreakdown: TypeBreakdownItem[] = typeGroups.map((g) => ({
    type: g.documentType,
    label: g.documentType ? (DOCUMENT_TYPE_LABELS[g.documentType] ?? g.documentType) : 'Tidak Diketahui',
    count: g._count.id,
  }))

  const recentDocs: RecentDocument[] = recentRaw.map((d) => ({
    id: d.id,
    documentNumber: d.documentNumber,
    subject: d.subject,
    documentDate: d.documentDate,
    extractionStatus: d.extractionStatus,
    divisions: d.divisions.map((dd) => dd.division.name),
  }))

  return {
    role: 'ADMIN',
    totalDocs,
    docsThisMonth,
    docsLastMonth,
    activeDivisions: activeDivisionRows.length,
    totalDivisions,
    activeUsers,
    totalUsers,
    trendData: fillMissingDates(trendRows, 30),
    typeBreakdown,
    recentDocs,
  }
}

async function getUserStats(userId: string, divisionId: string | null): Promise<UserDashboardStats> {
  if (!divisionId) {
    return {
      role: 'USER',
      noDivision: true,
      divisionTotalDocs: 0,
      divisionMonthDocs: 0,
      divisionLastMonthDocs: 0,
      mySearchCount: 0,
      mySearchLastMonth: 0,
      trendData: fillMissingDates([], 30),
      recentDocs: [],
    }
  }

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))
  const thirtyDaysAgo = subDays(now, 30)

  const divisionFilter = {
    status: DocumentStatus.READY,
    divisions: { some: { divisionId } },
  }

  const [
    divisionTotalDocs,
    divisionMonthDocs,
    divisionLastMonthDocs,
    mySearchCount,
    mySearchLastMonth,
    rawTrend,
    recentRaw,
  ] = await Promise.all([
    prisma.document.count({ where: divisionFilter }),

    prisma.document.count({
      where: { ...divisionFilter, createdAt: { gte: thisMonthStart } },
    }),

    prisma.document.count({
      where: {
        ...divisionFilter,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),

    prisma.activityLog.count({
      where: { userId, action: 'SEARCH', createdAt: { gte: thisMonthStart } },
    }),

    prisma.activityLog.count({
      where: {
        userId,
        action: 'SEARCH',
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),

    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(d."createdAt") as date, COUNT(*) as count
      FROM "Document" d
      JOIN "DocumentDivision" dd ON dd.document_id = d.id
      WHERE d.status = ${DocumentStatus.READY}
        AND dd.division_id = ${divisionId}
        AND d."createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE(d."createdAt")
      ORDER BY date ASC
    `,

    prisma.document.findMany({
      where: divisionFilter,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { divisions: { include: { division: true } } },
    }),
  ])

  const trendRows = rawTrend.map((r) => ({
    date: format(new Date(r.date), 'yyyy-MM-dd'),
    count: Number(r.count),
  }))

  const recentDocs: RecentDocument[] = recentRaw.map((d) => ({
    id: d.id,
    documentNumber: d.documentNumber,
    subject: d.subject,
    documentDate: d.documentDate,
    extractionStatus: d.extractionStatus,
    divisions: d.divisions.map((dd) => dd.division.name),
  }))

  return {
    role: 'USER',
    noDivision: false,
    divisionTotalDocs,
    divisionMonthDocs,
    divisionLastMonthDocs,
    mySearchCount,
    mySearchLastMonth,
    trendData: fillMissingDates(trendRows, 30),
    recentDocs,
  }
}

export async function getDashboardStats(
  role: string,
  userId: string,
  divisionId: string | null,
): Promise<DashboardStats> {
  if (role === 'ADMIN') {
    return getAdminStats()
  }
  return getUserStats(userId, divisionId)
}
