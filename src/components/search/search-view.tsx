'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { searchDocuments } from '@/app/(app)/search/actions'
import type { SearchFilters, SearchResult } from '@/app/(app)/search/actions'
import { queryDocuments } from '@/lib/idb'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { DocumentViewerModal } from '@/components/documents/document-viewer-modal'
import { FilterPanel } from '@/components/search/filter-panel'
import { SearchBar } from '@/components/search/search-bar'
import { SearchResultCard } from '@/components/search/search-result-card'

export type { SearchFilters, SearchResult }

export function SearchView({ debug: _debug, divisionId = null }: { debug?: boolean; divisionId?: string | null }) {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isNLInterpreted, setIsNLInterpreted] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<SearchResult | null>(null)
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
      if (!navigator.onLine) {
        const localResults = await queryDocuments(searchQuery, searchFilters, divisionId)
        setResults(
          localResults.map((doc) => ({
            id: doc.id,
            documentNumber: doc.document_number,
            sender: doc.sender,
            subject: doc.subject,
            documentDate: doc.document_date ? new Date(doc.document_date) : null,
            summary: doc.summary,
            extractedText: doc.extracted_text,
            r2Key: doc.r2_key,
          })),
        )
        setIsNLInterpreted(false)
        setHasSearched(true)
        return
      }

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
  }, [divisionId])

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
            Offline Mode — Searching local documents only.
          </AlertDescription>
        </Alert>
      )}

      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {isNLInterpreted && !!query.trim() && (
        <div>
          <Badge variant="secondary" className="text-xs font-normal">
            AI menafsirkan pencarian Anda
          </Badge>
        </div>
      )}

      <FilterPanel filters={filters} onChange={setFilters} />

      {/* Results */}
      {hasSearched && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {results.length} dokumen ditemukan
          </p>
          {results.map((result) => (
            <SearchResultCard
              key={result.id}
              result={result}
              showDebug={_debug}
              onOpen={setSelectedDocument}
            />
          ))}
        </div>
      )}

      {hasSearched && results.length === 0 && !isLoading && (
        <div className="py-12 text-center space-y-1">
          <p className="text-sm font-medium">
            Tidak ada dokumen ditemukan. Coba kata kunci lain atau ubah filter.
          </p>
          <p className="text-xs text-muted-foreground">
            Pastikan Anda terhubung ke internet untuk pencarian semantik.
          </p>
        </div>
      )}

      <DocumentViewerModal
        documentId={selectedDocument?.id ?? null}
        isOpen={!!selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </div>
  )
}
