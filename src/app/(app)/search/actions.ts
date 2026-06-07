'use server'

import { auth } from '@/auth'
import { generateEmbedding } from '@/lib/generate-embeddings'
import { parseNlQuery } from '@/lib/parse-nl-query'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

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

const SIMILARITY_THRESHOLD = 0.3
const RESULT_LIMIT = 20

type RawSearchRow = {
  id: string
  documentNumber: string | null
  sender: string | null
  subject: string | null
  documentDate: Date | null
  summary: string | null
  extractedText: string | null
  r2Key: string | null
  similarity: unknown
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

function buildDivisionWhere(isAdmin: boolean, divisionId: string | null) {
  if (isAdmin) return {}
  return { divisions: { some: { divisionId: divisionId ?? '' } } }
}

async function metadataSearch(
  isAdmin: boolean,
  divisionId: string | null,
  filters: SearchFilters,
): Promise<SearchResult[]> {
  const where: Record<string, unknown> = { ...buildDivisionWhere(isAdmin, divisionId) }

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
    take: RESULT_LIMIT,
  })

  return documents
}

// Semantic-only: no metadata filters, ranks purely by vector similarity.
async function semanticSearch(
  isAdmin: boolean,
  divisionId: string | null,
  queryVector: number[],
): Promise<SearchResult[]> {
  const vectorStr = JSON.stringify(queryVector)

  const rows = isAdmin
    ? await prisma.$queryRaw<RawSearchRow[]>`
        SELECT
          d.id,
          d."documentNumber",
          d.sender,
          d.subject,
          d."documentDate",
          d.summary,
          d."extractedText",
          d."r2Key",
          MAX(1 - (dc.embedding <=> ${vectorStr}::vector)) AS similarity
        FROM "Document" d
        JOIN "DocumentChunk" dc ON dc."documentId" = d.id
        WHERE d."extractionStatus" = 'completed'
          AND dc.embedding IS NOT NULL
          AND 1 - (dc.embedding <=> ${vectorStr}::vector) >= ${SIMILARITY_THRESHOLD}
        GROUP BY
          d.id, d."documentNumber", d.sender, d.subject,
          d."documentDate", d.summary, d."extractedText", d."r2Key"
        ORDER BY similarity DESC
        LIMIT ${RESULT_LIMIT}
      `
    : await prisma.$queryRaw<RawSearchRow[]>`
        SELECT
          d.id,
          d."documentNumber",
          d.sender,
          d.subject,
          d."documentDate",
          d.summary,
          d."extractedText",
          d."r2Key",
          MAX(1 - (dc.embedding <=> ${vectorStr}::vector)) AS similarity
        FROM "Document" d
        JOIN "DocumentChunk" dc ON dc."documentId" = d.id
        JOIN "DocumentDivision" dd ON dd."document_id" = d.id
        WHERE d."extractionStatus" = 'completed'
          AND dd."division_id" = ${divisionId}
          AND dc.embedding IS NOT NULL
          AND 1 - (dc.embedding <=> ${vectorStr}::vector) >= ${SIMILARITY_THRESHOLD}
        GROUP BY
          d.id, d."documentNumber", d.sender, d.subject,
          d."documentDate", d.summary, d."extractedText", d."r2Key"
        ORDER BY similarity DESC
        LIMIT ${RESULT_LIMIT}
      `

  return rows.map((row) => ({
    ...row,
    similarity: typeof row.similarity === 'string' ? parseFloat(row.similarity) : Number(row.similarity),
  }))
}

// Hybrid: apply metadata filters first, then rank survivors by vector similarity.
async function hybridSearch(
  isAdmin: boolean,
  divisionId: string | null,
  queryVector: number[],
  filters: SearchFilters,
): Promise<SearchResult[]> {
  const vectorStr = JSON.stringify(queryVector)

  // Build optional filter clauses
  const conditions: string[] = [
    `d."extractionStatus" = 'completed'`,
    `dc.embedding IS NOT NULL`,
    `1 - (dc.embedding <=> '${vectorStr}'::vector) >= ${SIMILARITY_THRESHOLD}`,
  ]

  if (!isAdmin) {
    conditions.push(`dd."division_id" = '${(divisionId ?? '').replace(/'/g, "''")}'`)
  }

  if (filters.documentNumber) {
    conditions.push(`d."documentNumber" ILIKE '%${filters.documentNumber.replace(/'/g, "''")}%'`)
  }
  if (filters.sender) {
    conditions.push(`d.sender ILIKE '%${filters.sender.replace(/'/g, "''")}%'`)
  }
  if (filters.subject) {
    conditions.push(`d.subject ILIKE '%${filters.subject.replace(/'/g, "''")}%'`)
  }
  if (filters.dateFrom) {
    conditions.push(`d."documentDate" >= '${filters.dateFrom}'`)
  }
  if (filters.dateTo) {
    conditions.push(`d."documentDate" <= '${filters.dateTo}'`)
  }

  const whereClause = conditions.join(' AND ')

  const divisionJoin = isAdmin
    ? ''
    : `JOIN "DocumentDivision" dd ON dd."document_id" = d.id`

  const rows = await prisma.$queryRawUnsafe<RawSearchRow[]>(`
    SELECT
      d.id,
      d."documentNumber",
      d.sender,
      d.subject,
      d."documentDate",
      d.summary,
      d."extractedText",
      d."r2Key",
      MAX(1 - (dc.embedding <=> '${vectorStr}'::vector)) AS similarity
    FROM "Document" d
    JOIN "DocumentChunk" dc ON dc."documentId" = d.id
    ${divisionJoin}
    WHERE ${whereClause}
    GROUP BY
      d.id, d."documentNumber", d.sender, d.subject,
      d."documentDate", d.summary, d."extractedText", d."r2Key"
    ORDER BY similarity DESC
    LIMIT ${RESULT_LIMIT}
  `)

  return rows.map((row) => ({
    ...row,
    similarity: typeof row.similarity === 'string' ? parseFloat(row.similarity) : Number(row.similarity),
  }))
}

export async function searchDocuments(
  query: string,
  filters: SearchFilters,
): Promise<SearchResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, results: [], isNLInterpreted: false, error: 'Not authenticated.' }
  }

  const isAdmin = session.user.role === 'ADMIN'
  const divisionId = session.user.divisionId ?? null
  const trimmedQuery = query.trim()

  if (!trimmedQuery && !hasActiveFilters(filters)) {
    return { success: true, results: [], isNLInterpreted: false }
  }

  void logActivity({
    userId: session.user.id,
    action: 'DOCUMENT_SEARCH',
    information: trimmedQuery ? `Query: "${trimmedQuery}"` : 'Filter only',
  }).catch(() => {})

  // Metadata-only path — no query text, only filters active.
  if (!trimmedQuery) {
    const results = await metadataSearch(isAdmin, divisionId, filters)
    return { success: true, results, isNLInterpreted: false }
  }

  // Run NL parsing and embedding generation in parallel for performance.
  const [parsed, queryVector] = await Promise.all([
    parseNlQuery(trimmedQuery),
    generateEmbedding(trimmedQuery),
  ])

  // Merge NL-extracted fields into filters — user-set values always take priority.
  let isNLInterpreted = false
  let mergedFilters = { ...filters }
  let parsedFilters: SearchFilters | undefined

  if (parsed) {
    const next: SearchFilters = {}
    let didMerge = false

    if (parsed.document_number && !filters.documentNumber) {
      next.documentNumber = parsed.document_number
      didMerge = true
    }
    if (parsed.sender && !filters.sender) {
      next.sender = parsed.sender
      didMerge = true
    }
    if (parsed.subject_keywords && !filters.subject) {
      next.subject = parsed.subject_keywords
      didMerge = true
    }
    if (parsed.date_from && !filters.dateFrom) {
      next.dateFrom = parsed.date_from
      didMerge = true
    }
    if (parsed.date_to && !filters.dateTo) {
      next.dateTo = parsed.date_to
      didMerge = true
    }

    if (didMerge) {
      mergedFilters = { ...filters, ...next }
      parsedFilters = next
      isNLInterpreted = true
    }
  }

  // Embedding failed — fall back to metadata search with merged filters.
  if (!queryVector) {
    const results = await metadataSearch(isAdmin, divisionId, mergedFilters)
    return { success: true, results, isNLInterpreted, parsedFilters }
  }

  const results = hasActiveFilters(mergedFilters)
    ? await hybridSearch(isAdmin, divisionId, queryVector, mergedFilters)
    : await semanticSearch(isAdmin, divisionId, queryVector)

  return { success: true, results, isNLInterpreted, parsedFilters }
}
