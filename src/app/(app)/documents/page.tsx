import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DocumentsView } from '@/components/documents/documents-view'

export default async function DocumentsPage() {
  const session = await auth()

  const isAdmin = session!.user.role === 'ADMIN'
  const divisionId = session!.user.divisionId

  const documents = await prisma.document.findMany({
    where: isAdmin
      ? { status: { not: 'LOCAL' } }
      : { divisions: { some: { divisionId: divisionId ?? '' } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Dokumen</h1>
      <DocumentsView documents={documents} />
    </div>
  )
}
