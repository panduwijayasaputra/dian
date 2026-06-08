'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Plus, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
}

export interface SessionListHandle {
  refresh: () => void
}

export const SessionList = forwardRef<SessionListHandle, SessionListProps>(
  function SessionList({ activeSessionId, onSelect, onNewChat }, ref) {
    const [sessions, setSessions] = useState<ChatSession[]>([])

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
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  'flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent',
                  activeSessionId === s.id && 'bg-accent'
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
            ))
          )}
        </div>
      </div>
    )
  }
)
