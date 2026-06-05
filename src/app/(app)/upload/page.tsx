import { prisma } from '@/lib/prisma'
import { UploadFlow } from './upload-flow'

export default async function UploadPage() {
  const divisions = await prisma.division.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Upload Document</h1>
      <UploadFlow divisions={divisions} />
    </div>
  )
}
