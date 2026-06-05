import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin/divisions" className="font-bold tracking-tight">
              DIAN Admin
            </Link>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/admin/divisions" className="hover:text-foreground transition-colors">
                Divisi
              </Link>
              <Link href="/admin/users" className="hover:text-foreground transition-colors">
                Pengguna
              </Link>
            </div>
          </div>
          <Link href="/documents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Kembali ke Aplikasi
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
