import { Bot } from 'lucide-react'
import { SourceCard } from '@/components/chat/source-card'

export interface Source {
  documentId: string
  documentNumber: string | null
  subject: string | null
  excerpt: string
}

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  isStreaming?: boolean
  onViewDocument?: (documentId: string) => void
}

export function MessageBubble({ role, content, sources = [], isStreaming, onViewDocument }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-white">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex max-w-[75%] flex-col gap-2">
        <div className="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-700">
          {content}
          {isStreaming && (
            <span className="ml-1 inline-flex gap-0.5">
              <span className="animate-bounce [animation-delay:0ms]">·</span>
              <span className="animate-bounce [animation-delay:150ms]">·</span>
              <span className="animate-bounce [animation-delay:300ms]">·</span>
            </span>
          )}
        </div>
        {sources.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-400">Sumber dokumen</span>
            {sources.filter((src, i, arr) => arr.findIndex(s => s.documentId === src.documentId) === i).map((src) => (
              <SourceCard key={src.documentId} {...src} onView={onViewDocument ?? (() => {})} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
