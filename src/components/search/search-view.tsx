'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export type SearchFilters = {
  documentNumber?: string
  sender?: string
  subject?: string
  dateFrom?: string
  dateTo?: string
}

export type SearchResult = {
  id: string
  documentNumber: string | null
  sender: string | null
  subject: string | null
  documentDate: Date | null
  summary: string | null
  extractedText: string | null
  r2Key: string | null
  similarity?: number
}

export function SearchView({ debug }: { debug?: boolean }) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isNLInterpreted, setIsNLInterpreted] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className="space-y-4">
      {!isOnline && (
        <Alert>
          <AlertDescription>
            Search requires an internet connection.
          </AlertDescription>
        </Alert>
      )}

      {/* Search bar — wired in task 2.4 */}
      <div className="h-10 rounded-md border bg-muted/30" />

      {/* Filter panel — wired in task 2.4 */}
      <div />

      {/* Results area — wired in task 5.x */}
      {hasSearched && (
        <div className="text-sm text-muted-foreground">
          {results.length} dokumen ditemukan
        </div>
      )}
    </div>
  )
}
