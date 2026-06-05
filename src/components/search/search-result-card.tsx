'use client'

import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import type { SearchResult } from '@/app/(app)/search/actions'

function getExcerpt(result: SearchResult): string | null {
  const source = result.summary ?? result.extractedText
  if (!source) return null
  return source.slice(0, 150)
}

type SearchResultCardProps = {
  result: SearchResult
  showDebug?: boolean
  onOpen: (result: SearchResult) => void
}

export function SearchResultCard({ result, showDebug, onOpen }: SearchResultCardProps) {
  const excerpt = getExcerpt(result)
  const dateLabel = result.documentDate
    ? format(new Date(result.documentDate), 'd MMM yyyy', { locale: idLocale })
    : null

  return (
    <button
      onClick={() => onOpen(result)}
      className="w-full text-left"
    >
      <Card
        size="sm"
        className="cursor-pointer transition-shadow hover:ring-2 hover:ring-primary/30"
      >
        <CardHeader>
          <CardTitle className="text-sm">
            {result.documentNumber ?? <span className="italic text-muted-foreground">Tanpa nomor</span>}
          </CardTitle>
          {dateLabel && (
            <CardAction>
              <span className="text-xs text-muted-foreground">{dateLabel}</span>
            </CardAction>
          )}
          {result.sender && (
            <CardDescription className="text-xs">{result.sender}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-1">
          {result.subject && (
            <p className="text-sm font-medium leading-snug">{result.subject}</p>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {excerpt ?? <span className="italic">Tidak ada ringkasan tersedia</span>}
          </p>

          {showDebug && result.similarity != null && (
            <div className="flex justify-end pt-1">
              <Badge variant="outline" className="text-xs font-mono">
                {Math.round(result.similarity * 100)}% relevan
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  )
}
