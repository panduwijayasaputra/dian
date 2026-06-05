'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CloudCheck, CloudOff, CloudUpload, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listDocuments } from '@/lib/idb'
import { syncAll } from '@/lib/sync'

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
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const isSyncingRef = useRef(false)

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
    if (typeof window === 'undefined') return

    getPendingCount().then((count) => {
      setPendingCount(count)
      // Seed IndexedDB on first load if empty
      if (count === 0 && navigator.onLine) {
        listDocuments().then((docs) => {
          if (docs.length === 0) void handleSync()
        })
      }
    })

    function handleOnline() {
      setIsOnline(true)
      void handleSync()
    }
    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleSync])

  function icon() {
    if (isSyncing) return <Loader2 className="h-4 w-4 animate-spin" />
    if (!isOnline) return <CloudOff className="h-4 w-4" />
    if (pendingCount > 0) return <CloudUpload className="h-4 w-4" />
    return <CloudCheck className="h-4 w-4" />
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
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
      {lastSynced && isOnline && !isSyncing && (
        <span className="text-[10px] text-muted-foreground">{timeAgo(lastSynced)}</span>
      )}
    </div>
  )
}
