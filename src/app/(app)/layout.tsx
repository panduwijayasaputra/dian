import { auth } from '@/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { AppHeader } from '@/components/layout/header'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { SyncButton } from '@/components/pwa/sync-button'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'
  const userName = session?.user?.name ?? session?.user?.email ?? 'Pengguna'

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isAdmin={isAdmin} userName={userName} />

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <AppHeader userName={userName} isAdmin={isAdmin}>
          <InstallPrompt />
          <SyncButton />
        </AppHeader>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
