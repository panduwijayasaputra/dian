import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { UploadFlow } from './upload-flow'

export default async function UploadPage() {
  const divisions = await prisma.division.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/documents"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-2 mb-2 text-slate-500')}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Kembali ke Dokumen
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Unggah Dokumen</h1>
        <p className="mt-1 text-sm text-slate-500">Unggah file PDF untuk diproses dan diindeks</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <UploadFlow divisions={divisions} />
      </div>
    </div>
  )
}
