'use client'

import { useState, useTransition } from 'react'
import { logoutAction } from '@/app/(auth)/login/logout-action'
import { changePassword } from '@/app/(app)/profile/actions'
import { FileText, KeyRound, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { SidebarBody } from '@/components/layout/sidebar'

interface AppHeaderProps {
  userName: string
  isAdmin: boolean
  children?: React.ReactNode
}

export function AppHeader({ userName, isAdmin, children }: AppHeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const initial = userName.charAt(0).toUpperCase()

  function handleOpenChangePassword() {
    setPopoverOpen(false)
    setDialogOpen(true)
  }

  function resetForm() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccess(false)
  }

  function handleDialogClose() {
    setDialogOpen(false)
    resetForm()
  }

  function handleSubmit() {
    setError(null)
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak sesuai.')
      return
    }
    startTransition(async () => {
      const result = await changePassword(currentPassword, newPassword)
      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <div className="flex h-14 md:h-16 shrink-0 items-center border-b border-border/80 bg-white px-4 md:px-6">
        {/* Mobile: hamburger + logo */}
        <div className="flex items-center gap-3 md:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors text-slate-500">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Buka menu</span>
            </SheetTrigger>
            <SheetContent side="left" showCloseButton={false} className="w-64 p-0">
              <SidebarBody isAdmin={isAdmin} userName={userName} onNavigate={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-slate-900">DIAN</span>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Controls: always visible */}
        <div className="flex items-center gap-2">
          {children}

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              {initial}
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-44 p-1">
              <button
                onClick={handleOpenChangePassword}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                Ganti Password
              </button>
              <button
                onClick={() => logoutAction()}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-400" />
                Keluar
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti Password</DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="py-2 flex flex-col items-center gap-4">
              <p className="text-sm text-green-600 font-medium">Password berhasil diubah.</p>
              <Button onClick={handleDialogClose}>Tutup</Button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="current-password">Password Lama</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isPending}
                  autoComplete="current-password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password">Password Baru</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isPending}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isPending}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
