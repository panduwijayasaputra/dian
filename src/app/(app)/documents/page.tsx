import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DocumentsView } from '@/components/documents/documents-view'

export default async function DocumentsPage() {
  const session = await auth()

  const documents = await prisma.document.findMany({
    where: { userId: session!.user!.id! },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Dokumen</h1>
      <DocumentsView documents={documents} />
    </div>
  )
}
