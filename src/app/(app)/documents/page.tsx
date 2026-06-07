import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DocumentsView } from '@/components/documents/documents-view'
import type { Prisma } from '@/generated/prisma/client'

interface PageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    q?: string
    type?: string
    status?: string
    division?: string
  }>
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const session = await auth()
  const isAdmin = session!.user.role === 'ADMIN'
  const divisionId = session!.user.divisionId

  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = [10, 20, 50].includes(Number(params.pageSize)) ? Number(params.pageSize) : 20
  const q = params.q?.trim() ?? ''
  const typeFilter = params.type ?? ''
  const statusFilter = params.status ?? ''
  const divisionFilter = params.division ?? ''

  const skip = (page - 1) * pageSize

  const baseCondition: Prisma.DocumentWhereInput = isAdmin
    ? { status: { not: 'LOCAL' } }
    : { divisions: { some: { divisionId: divisionId ?? '' } } }

  const searchCondition: Prisma.DocumentWhereInput = q
    ? {
        OR: [
          { documentNumber: { contains: q, mode: 'insensitive' } },
          { subject: { contains: q, mode: 'insensitive' } },
          { sender: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {}

  const filterConditions: Prisma.DocumentWhereInput[] = [
    typeFilter ? { documentType: typeFilter as Prisma.EnumDocumentTypeNullableFilter['equals'] } : {},
    statusFilter ? { status: statusFilter as Prisma.EnumDocumentStatusFilter['equals'] } : {},
    divisionFilter ? { divisions: { some: { divisionId: divisionFilter } } } : {},
  ].filter((c) => Object.keys(c).length > 0)

  const where: Prisma.DocumentWhereInput = {
    AND: [baseCondition, searchCondition, ...filterConditions],
  }

  const select = {
    id: true,
    documentNumber: true,
    documentType: true,
    subject: true,
    sender: true,
    receiver: true,
    documentDate: true,
    urgency: true,
    security: true,
    deadlineStart: true,
    deadlineEnd: true,
    memo: true,
    status: true,
    extractionStatus: true,
    r2Key: true,
    originalName: true,
    divisions: {
      include: { division: { select: { id: true, name: true, color: true } } },
    },
  }

  const [documents, total, divisions] = await Promise.all([
    prisma.document.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, select }),
    prisma.document.count({ where }),
    isAdmin
      ? prisma.division.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dokumen</h1>
        <p className="mt-1 text-sm text-slate-500">Semua dokumen yang dapat Anda akses</p>
      </div>
      <DocumentsView
        documents={documents}
        total={total}
        page={page}
        pageSize={pageSize}
        q={q}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        divisionFilter={divisionFilter}
        isAdmin={isAdmin}
        divisions={divisions}
        userDivisionId={divisionId ?? null}
      />
    </div>
  )
}
