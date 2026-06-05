'use client'

import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [canInstall, setCanInstall] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    function handleAppInstalled() {
      setCanInstall(false)
      promptRef.current = null
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  if (!canInstall) return null

  async function handleInstall() {
    if (!promptRef.current) return
    await promptRef.current.prompt()
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleInstall}>
      <Download className="mr-1.5 h-4 w-4" />
      Install App
    </Button>
  )
}
