import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Anda sedang offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Halaman ini tidak tersedia saat offline. Periksa koneksi internet Anda, lalu coba lagi.
      </p>
      <Button asChild variant="outline">
        <Link href="/documents">Kembali ke Dokumen</Link>
      </Button>
    </div>
  )
}
