import Link from 'next/link'
import { LogoutButton } from '@/components/auth/logout-button'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/documents" className="font-bold tracking-tight">
              DIAN
            </Link>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/documents" className="hover:text-foreground transition-colors">
                Dokumen
              </Link>
              <Link href="/upload" className="hover:text-foreground transition-colors">
                Unggah
              </Link>
            </div>
          </div>
          <LogoutButton />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
