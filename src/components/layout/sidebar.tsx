'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logoutAction } from '@/app/(auth)/login/logout-action'
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Building2,
  Users,
  ClipboardList,
  Menu,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'

const menuUtama = [
  { href: '/', label: 'Beranda', icon: LayoutDashboard },
  { href: '/documents', label: 'Dokumen', icon: FileText },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
]

const menuAdmin = [
  { href: '/divisi', label: 'Divisi', icon: Building2 },
  { href: '/pengguna', label: 'Pengguna', icon: Users },
  { href: '/log-aktivitas', label: 'Log Aktivitas', icon: ClipboardList },
]

interface SidebarProps {
  isAdmin: boolean
  userName: string
}

function NavLinks({ isAdmin, pathname, onNavigate }: { isAdmin: boolean; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
      <div className="flex flex-col gap-0.5">
        {menuUtama.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-slate-400')} />
              {label}
            </Link>
          )
        })}
      </div>

      {isAdmin && (
        <>
          <div className="my-3 border-t border-border" />
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Manajemen
          </p>
          <div className="flex flex-col gap-0.5">
            {menuAdmin.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-slate-400')} />
                  {label}
                </Link>
              )
            })}
          </div>
        </>
      )}
    </nav>
  )
}

export function SidebarBody({ isAdmin, userName, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <FileText className="h-8 w-8 shrink-0 text-primary" />
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight text-slate-900">DIAN</span>
          <span className="text-[10px] text-slate-400 tracking-wide">Document Intelligence Archive Network</span>
        </div>
      </div>

      <NavLinks isAdmin={isAdmin} pathname={pathname} onNavigate={onNavigate} />

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-xs font-semibold text-primary">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
            <p className="text-xs text-slate-400">{isAdmin ? 'Administrator' : 'Pengguna'}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => logoutAction()}
            title="Keluar"
            className="shrink-0 text-slate-400 hover:text-slate-600"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ isAdmin, userName }: SidebarProps) {
  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col border-r border-border/80 bg-white">
      <SidebarBody isAdmin={isAdmin} userName={userName} />
    </aside>
  )
}

export function MobileTopBar({ isAdmin, userName }: SidebarProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex h-14 items-center border-b border-border/80 bg-white px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-slate-500"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Buka menu</span>
        </SheetTrigger>
        <SheetContent side="left" showCloseButton={false} className="w-64 p-0">
          <SidebarBody isAdmin={isAdmin} userName={userName} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="ml-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-slate-900">DIAN</span>
      </div>
    </div>
  )
}
