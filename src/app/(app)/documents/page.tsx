import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DocumentsView } from '@/components/documents/documents-view'

export default async function DocumentsPage() {
  const session = await auth()
  const isAdmin = session!.user.role === 'ADMIN'
  const divisionId = session!.user.divisionId

  const [documents, divisions] = await Promise.all([
    prisma.document.findMany({
      where: isAdmin
        ? { status: { not: 'LOCAL' } }
        : { divisions: { some: { divisionId: divisionId ?? '' } } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        documentNumber: true,
        documentType: true,
        subject: true,
        sender: true,
        receiver: true,
        documentDate: true,
        urgency: true,
        security: true,
        deadline: true,
        status: true,
        extractionStatus: true,
        r2Key: true,
        originalName: true,
        divisions: {
          include: { division: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
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
      <DocumentsView documents={documents} isAdmin={isAdmin} divisions={divisions} />
    </div>
  )
}
