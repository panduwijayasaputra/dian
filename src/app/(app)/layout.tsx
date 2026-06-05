import Link from 'next/link'
import { auth } from '@/auth'
import { LogoutButton } from '@/components/auth/logout-button'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { SyncButton } from '@/components/pwa/sync-button'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

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
              {isAdmin && (
                <Link href="/upload" className="hover:text-foreground transition-colors">
                  Unggah
                </Link>
              )}
              <Link href="/search" className="hover:text-foreground transition-colors">
                Cari
              </Link>
              {isAdmin && (
                <Link href="/admin" className="hover:text-foreground transition-colors">
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InstallPrompt />
            <SyncButton />
            <LogoutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
