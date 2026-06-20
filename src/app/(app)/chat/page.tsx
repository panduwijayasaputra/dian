'use client'

import { useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { SessionList, type SessionListHandle } from '@/components/chat/session-list'
import { ChatThread } from '@/components/chat/chat-thread'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'

export default function ChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sessionListRef = useRef<SessionListHandle>(null)

  function handleSessionCreated(id: string) {
    setActiveSessionId(id)
    sessionListRef.current?.refresh()
  }

  function handleSessionDeleted(id: string) {
    if (activeSessionId === id) setActiveSessionId(null)
  }

  function handleMobileSelect(id: string) {
    setActiveSessionId(id)
    setMobileOpen(false)
  }

  function handleMobileNewChat() {
    setActiveSessionId(null)
    setMobileOpen(false)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-border bg-white md:h-[calc(100vh-9.5rem)]">
      {/* Desktop sidebar */}
      <div className="hidden w-64 shrink-0 border-r md:flex md:flex-col">
        <SessionList
          ref={sessionListRef}
          activeSessionId={activeSessionId}
          onSelect={setActiveSessionId}
          onNewChat={() => setActiveSessionId(null)}
          onDelete={handleSessionDeleted}
        />
      </div>

      {/* Mobile session drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-72 p-0">
          <SessionList
            activeSessionId={activeSessionId}
            onSelect={handleMobileSelect}
            onNewChat={handleMobileNewChat}
            onDelete={handleSessionDeleted}
          />
        </SheetContent>
      </Sheet>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Buka percakapan</span>
          </Button>
          <span className="text-sm font-medium text-slate-500">Percakapan</span>
        </div>
        <ChatThread
          sessionId={activeSessionId}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    </div>
  )
}
