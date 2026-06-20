'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { RefreshCw, CloudOff, CloudUpload, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listDocuments } from '@/lib/idb'
import { syncAll } from '@/lib/sync'

function subscribeToOnline(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'baru saja'
  if (diffMin === 1) return '1 mnt lalu'
  if (diffMin < 60) return `${diffMin} mnt lalu`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr === 1) return '1 jam lalu'
  return `${diffHr} jam lalu`
}

async function getPendingCount(): Promise<number> {
  const docs = await listDocuments()
  return docs.filter((d) => d.status === 'pending_sync').length
}

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const isSyncingRef = useRef(false)

  const isOnline = useSyncExternalStore(
    subscribeToOnline,
    () => navigator.onLine,
    () => true,
  )

  const handleSync = useCallback(async () => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true
    setIsSyncing(true)
    try {
      await syncAll()
      setLastSynced(new Date())
      setPendingCount(await getPendingCount())
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    getPendingCount().then((count) => {
      setPendingCount(count)
      // Seed IndexedDB on first load if empty
      if (count === 0 && navigator.onLine) {
        listDocuments().then((docs) => {
          if (docs.length === 0) void handleSync()
        })
      }
    })
  }, [handleSync])

  useEffect(() => {
    if (isOnline) void handleSync()
  }, [isOnline, handleSync])

  function icon() {
    if (isSyncing) return <Loader2 className="h-4 w-4 animate-spin" />
    if (!isOnline) return <CloudOff className="h-4 w-4" />
    if (pendingCount > 0) return <CloudUpload className="h-4 w-4" />
    return <RefreshCw className="h-4 w-4" />
  }

  function statusText() {
    if (isSyncing) return 'Menyinkronkan...'
    if (!isOnline) return 'Offline'
    if (lastSynced) return timeAgo(lastSynced)
    return null
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isSyncing || !isOnline}
          onClick={() => void handleSync()}
          aria-label="Sync documents"
        >
          {icon()}
        </Button>
        {pendingCount > 0 && !isSyncing && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px]"
          >
            {pendingCount}
          </Badge>
        )}
      </div>
      {statusText() && (
        <span className="text-xs text-muted-foreground">{statusText()}</span>
      )}
    </div>
  )
}
