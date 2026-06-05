import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { MetadataFormValues } from '@/components/documents/metadata-form'
import { SettingsForm } from './settings-form'

interface SettingsPageProps {
  params: Promise<{ id: string }>
}

export default async function DocumentSettingsPage({ params }: SettingsPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'
  const { id } = await params

  const document = await prisma.document.findUnique({
    where: { id },
    include: { divisions: { select: { divisionId: true } } },
  })
  if (!document) redirect('/documents')

  if (!isAdmin) {
    const divisionId = session.user.divisionId
    if (!divisionId) redirect('/documents')
    const access = document.divisions.some((d) => d.divisionId === divisionId)
    if (!access) redirect('/documents')
  }

  const defaultValues: MetadataFormValues = {
    documentNumber: document.documentNumber ?? '',
    documentDate: document.documentDate
      ? document.documentDate.toISOString().split('T')[0]
      : '',
    sender: document.sender ?? '',
    subject: document.subject ?? '',
    documentType: document.documentType ?? '',
    divisionIds: document.divisions.map((d) => d.divisionId),
  }

  const divisions = isAdmin
    ? await prisma.division.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
    : undefined

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Edit Metadata</h1>
        {document.originalName && (
          <p className="mt-1 text-sm text-muted-foreground">{document.originalName}</p>
        )}
      </div>
      <SettingsForm documentId={id} defaultValues={defaultValues} divisions={divisions} />
    </div>
  )
}
