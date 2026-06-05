'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

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

export type SearchResponse = {
  success: boolean
  results: SearchResult[]
  isNLInterpreted: boolean
  parsedFilters?: SearchFilters
  error?: string
}

function hasActiveFilters(filters: SearchFilters): boolean {
  return !!(
    filters.documentNumber ||
    filters.sender ||
    filters.subject ||
    filters.dateFrom ||
    filters.dateTo
  )
}

async function metadataSearch(
  userId: string,
  filters: SearchFilters,
): Promise<SearchResult[]> {
  const where: Record<string, unknown> = { userId }

  if (filters.documentNumber) {
    where.documentNumber = { contains: filters.documentNumber, mode: 'insensitive' }
  }
  if (filters.sender) {
    where.sender = { contains: filters.sender, mode: 'insensitive' }
  }
  if (filters.subject) {
    where.subject = { contains: filters.subject, mode: 'insensitive' }
  }
  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom)
    if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo)
    where.documentDate = dateFilter
  }

  const documents = await prisma.document.findMany({
    where,
    select: {
      id: true,
      documentNumber: true,
      sender: true,
      subject: true,
      documentDate: true,
      summary: true,
      extractedText: true,
      r2Key: true,
    },
    orderBy: { documentDate: 'desc' },
    take: 20,
  })

  return documents
}

export async function searchDocuments(
  query: string,
  filters: SearchFilters,
): Promise<SearchResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, results: [], isNLInterpreted: false, error: 'Not authenticated.' }
  }

  const userId = session.user.id
  const trimmedQuery = query.trim()

  if (!trimmedQuery && !hasActiveFilters(filters)) {
    return { success: true, results: [], isNLInterpreted: false }
  }

  // Metadata-only path — no query text, only filters active.
  // Semantic and hybrid paths added in tasks 3.1 and 4.2.
  if (!trimmedQuery) {
    const results = await metadataSearch(userId, filters)
    return { success: true, results, isNLInterpreted: false }
  }

  // Query present — semantic/hybrid/NL paths handled in tasks 3.1–4.3.
  // Temporary fallback: metadata-only with whatever filters are active.
  const results = await metadataSearch(userId, filters)
  return { success: true, results, isNLInterpreted: false }
}
