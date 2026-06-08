'use client'

import { useRef, useState } from 'react'
import { SessionList, type SessionListHandle } from '@/components/chat/session-list'
import { ChatThread } from '@/components/chat/chat-thread'

export default function ChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const sessionListRef = useRef<SessionListHandle>(null)

  function handleSessionCreated(id: string) {
    setActiveSessionId(id)
    sessionListRef.current?.refresh()
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-border bg-white md:h-[calc(100vh-9.5rem)]">
      <div className="w-64 shrink-0 border-r">
        <SessionList
          ref={sessionListRef}
          activeSessionId={activeSessionId}
          onSelect={setActiveSessionId}
          onNewChat={() => setActiveSessionId(null)}
        />
      </div>
      <div className="flex min-w-0 flex-1">
        <ChatThread
          sessionId={activeSessionId}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    </div>
  )
}
