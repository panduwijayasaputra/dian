'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot } from 'lucide-react'
import { getChatMessages, type ChatMessageData } from '@/app/(app)/chat/actions'
import { MessageBubble, type Source } from '@/components/chat/message-bubble'
import { ChatInput } from '@/components/chat/chat-input'

interface ChatThreadProps {
  sessionId: string | null
  onSessionCreated: (id: string) => void
}

interface StreamingMessage {
  id: string
  content: string
}

export function ChatThread({ sessionId, onSessionCreated }: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [streaming, setStreaming] = useState<StreamingMessage | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const justCreatedRef = useRef(false)

  useEffect(() => {
    if (!sessionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([])
      setStreaming(null)
      return
    }
    if (justCreatedRef.current) {
      justCreatedRef.current = false
      return
    }
    getChatMessages(sessionId).then(setMessages)
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function handleSend(text: string) {
    if (isStreaming) return

    let currentSessionId = sessionId

    if (!currentSessionId) {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 60) }),
      })
      if (!res.ok) return
      const data = await res.json()
      currentSessionId = data.session.id
      justCreatedRef.current = true
      onSessionCreated(currentSessionId!)
    }

    const userMsg: ChatMessageData = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      sources: null,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)
    setStreaming({ id: crypto.randomUUID(), content: '' })

    try {
      const res = await fetch(`/api/chat/${currentSessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const token = JSON.parse(data)
            if (typeof token === 'string') {
              fullText += token
              setStreaming((prev) => (prev ? { ...prev, content: fullText } : prev))
            }
          } catch {
            // malformed SSE line, skip
          }
        }
      }

      const saved = await getChatMessages(currentSessionId!)
      setMessages(saved)
    } catch {
      // stream error — keep optimistic messages
    } finally {
      setStreaming(null)
      setIsStreaming(false)
    }
  }

  const showEmptyState = !sessionId && messages.length === 0 && !streaming

  return (
    <div className="flex h-full w-full flex-col">
      {showEmptyState ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
          <Bot className="h-10 w-10" />
          <p className="text-sm">Mulai percakapan baru</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role as 'user' | 'assistant'}
              content={msg.content}
              sources={Array.isArray(msg.sources) ? (msg.sources as Source[]) : []}
            />
          ))}
          {streaming && (
            <MessageBubble
              role="assistant"
              content={streaming.content}
              sources={[]}
              isStreaming
            />
          )}
          <div ref={bottomRef} />
        </div>
      )}
      <div className="border-t border-border">
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  )
}
