'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
  id: string
  role: 'assistant' | 'user'
  text: string
}

const pesanAwal: Message = {
  id: 'welcome',
  role: 'assistant',
  text: 'Halo! Saya DIAN. Tanyakan dokumen apapun kepada saya — misalnya "Cari surat keputusan bulan Maret" atau "Tampilkan nota dinas dari divisi keuangan".',
}

export default function AsistenPage() {
  const [messages, setMessages] = useState<Message[]>([pesanAwal])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = input.trim()
    if (!text) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text }
    const replyMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: 'Fitur pencarian AI sedang dalam pengembangan. Segera hadir!',
    }

    setMessages((prev) => [...prev, userMsg, replyMsg])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-9.5rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Asisten</h1>
        <p className="mt-1 text-sm text-slate-500">Tanyakan dokumen menggunakan bahasa alami</p>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              {msg.role === 'assistant' && (
                <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={
                  msg.role === 'user'
                    ? 'max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-white'
                    : 'max-w-[75%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-700'
                }
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan sesuatu tentang dokumen..."
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Kirim</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
