import Link from 'next/link'
import { FileX } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export function EmptyDocuments() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
      <FileX className="h-12 w-12 text-muted-foreground" />
      <div>
        <p className="font-medium">Belum ada dokumen</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Unggah dokumen pertama Anda untuk memulai.
        </p>
      </div>
      <Link href="/upload" className={buttonVariants()}>
        Unggah dokumen
      </Link>
    </div>
  )
}
