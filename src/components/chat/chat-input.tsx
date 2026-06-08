'use client'

import { useState } from 'react'
import { Send, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOnlineStatus } from '@/hooks/use-online-status'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const isOnline = useOnlineStatus()

  function handleSend() {
    const text = input.trim()
    if (!text || disabled || !isOnline) return
    onSend(text)
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-4">
      {!isOnline && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
          <WifiOff className="h-3.5 w-3.5" />
          Fitur ini memerlukan koneksi internet
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tanyakan sesuatu tentang dokumen..."
          disabled={disabled || !isOnline}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          size="icon"
          disabled={!input.trim() || disabled || !isOnline}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Kirim</span>
        </Button>
      </div>
    </div>
  )
}
