'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { searchDocuments } from '@/app/(app)/search/actions'
import type { SearchFilters, SearchResult } from '@/app/(app)/search/actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FilterPanel } from '@/components/search/filter-panel'
import { SearchBar } from '@/components/search/search-bar'

export type { SearchFilters, SearchResult }

export function SearchView({ debug: _debug }: { debug?: boolean }) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isNLInterpreted, setIsNLInterpreted] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [, startTransition] = useTransition()

  // Keep a ref to the latest query so the filters effect can read it without
  // being in its dependency array (we don't want a query change alone to
  // re-trigger the effect — only filter changes should).
  const queryRef = useRef(query)
  useEffect(() => {
    queryRef.current = query
  }, [query])

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

  const runSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    setIsLoading(true)
    try {
      const response = await searchDocuments(searchQuery, searchFilters)
      if (response.success) {
        setResults(response.results)
        setIsNLInterpreted(response.isNLInterpreted)
        if (response.parsedFilters) {
          setFilters((prev) => ({ ...prev, ...response.parsedFilters }))
        }
      }
    } finally {
      setIsLoading(false)
      setHasSearched(true)
    }
  }, [])

  // Re-run search when filters change after the first search.
  // startTransition defers setState calls so they don't run synchronously
  // in the effect body.
  const hasSearchedRef = useRef(hasSearched)
  useEffect(() => {
    hasSearchedRef.current = hasSearched
  }, [hasSearched])

  useEffect(() => {
    if (!hasSearchedRef.current) return
    startTransition(() => {
      void runSearch(queryRef.current, filters)
    })
  // filters is the only thing that should trigger this effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  function handleSubmit() {
    void runSearch(query, filters)
  }

  return (
    <div className="space-y-4">
      {!isOnline && (
        <Alert>
          <AlertDescription>
            Search requires an internet connection.
          </AlertDescription>
        </Alert>
      )}

      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        disabled={!isOnline}
      />

      {isNLInterpreted && (
        <p className="text-xs text-muted-foreground">
          AI menafsirkan pencarian Anda
        </p>
      )}

      <FilterPanel filters={filters} onChange={setFilters} />

      {/* Results — wired in tasks 5.1–5.3 */}
      {hasSearched && (
        <p className="text-sm text-muted-foreground">
          {results.length} dokumen ditemukan
        </p>
      )}
    </div>
  )
}
