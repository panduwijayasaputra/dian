import { auth } from '@/auth'
import { Sidebar, MobileTopBar } from '@/components/layout/sidebar'
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
        {/* Mobile top bar — hamburger + logo, hidden on md+ */}
        <MobileTopBar isAdmin={isAdmin} userName={userName} />
        {/* Desktop header — PWA controls, hidden below md */}
        <div className="hidden md:flex h-16 shrink-0 items-center justify-end border-b border-border/80 bg-white px-6 gap-2">
          <InstallPrompt />
          <SyncButton />
        </div>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  )
}
