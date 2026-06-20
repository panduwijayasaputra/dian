'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Plus, MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ChatSession {
  id: string
  title: string
  updatedAt: string
}

interface SessionListProps {
  activeSessionId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete?: (id: string) => void
}

export interface SessionListHandle {
  refresh: () => void
}

export const SessionList = forwardRef<SessionListHandle, SessionListProps>(
  function SessionList({ activeSessionId, onSelect, onNewChat, onDelete }, ref) {
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmId, setConfirmId] = useState<string | null>(null)

    async function fetchSessions() {
      try {
        const res = await fetch('/api/chat/sessions')
        if (!res.ok) return
        const data = await res.json()
        setSessions(data.sessions ?? [])
      } catch {
        // network error — keep existing list
      }
    }

    useEffect(() => {
      fetchSessions()
    }, [])

    useImperativeHandle(ref, () => ({ refresh: fetchSessions }))

    async function handleDelete() {
      if (!confirmId) return
      const idToDelete = confirmId
      setConfirmId(null)
      setDeletingId(idToDelete)
      try {
        const res = await fetch(`/api/chat/sessions/${idToDelete}`, { method: 'DELETE' })
        if (res.ok) {
          setSessions((prev) => prev.filter((s) => s.id !== idToDelete))
          onDelete?.(idToDelete)
        }
      } finally {
        setDeletingId(null)
      }
    }

    const confirmSession = sessions.find((s) => s.id === confirmId)

    return (
      <div className="flex h-full flex-col">
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={onNewChat}
          >
            <Plus className="h-4 w-4" />
            Chat Baru
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-slate-400">
              Belum ada percakapan
            </p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="group relative">
                <button
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    'flex w-full flex-col items-start rounded-lg px-3 py-2.5 pr-9 text-left transition-colors hover:bg-accent',
                    activeSessionId === s.id && 'bg-accent',
                    deletingId === s.id && 'opacity-50 pointer-events-none'
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800 line-clamp-1">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {s.title}
                  </span>
                  <span className="mt-0.5 text-xs text-slate-400">
                    {formatDistanceToNow(new Date(s.updatedAt), {
                      addSuffix: true,
                      locale: localeId,
                    })}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmId(s.id)
                  }}
                  disabled={deletingId === s.id}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="Hapus percakapan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <Dialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Hapus percakapan?</DialogTitle>
              <DialogDescription>
                &ldquo;{confirmSession?.title}&rdquo; akan dihapus permanen beserta semua pesannya.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmId(null)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
)
