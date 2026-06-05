import { openDB as idbOpen, type IDBPDatabase } from 'idb'
import type { SearchFilters } from '@/app/(app)/search/actions'

export interface LocalDocument {
  id: string
  document_number: string | null
  document_date: string | null  // ISO date string e.g. "2025-01-15"
  sender: string | null
  subject: string | null
  summary: string | null
  extracted_text: string | null
  status: 'pending_sync' | 'synced' | 'processing' | 'ready' | 'failed'
  r2_key: string | null
  file_blob: Blob | null
  original_name: string | null
  created_at: string      // ISO datetime
  synced_at: string | null  // ISO datetime
}

interface DianDB {
  documents: {
    key: string
    value: LocalDocument
    indexes: {
      by_status: string
      by_sender: string
      by_date: string
    }
  }
}

let dbPromise: Promise<IDBPDatabase<DianDB>> | null = null

export function openDB(): Promise<IDBPDatabase<DianDB>> | null {
  if (typeof window === 'undefined') return null

  if (!dbPromise) {
    dbPromise = idbOpen<DianDB>('dian-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('documents', { keyPath: 'id' })
        store.createIndex('by_status', 'status')
        store.createIndex('by_sender', 'sender')
        store.createIndex('by_date', 'document_date')
      },
    })
  }

  return dbPromise
}

export async function upsertDocument(doc: LocalDocument): Promise<void> {
  const db = await openDB()
  if (!db) return
  await db.put('documents', doc)
}

export async function getDocument(id: string): Promise<LocalDocument | undefined> {
  const db = await openDB()
  if (!db) return undefined
  return db.get('documents', id)
}

export async function listDocuments(): Promise<LocalDocument[]> {
  const db = await openDB()
  if (!db) return []
  return db.getAll('documents')
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDB()
  if (!db) return
  await db.delete('documents', id)
}

export async function queryDocuments(
  query: string,
  filters: SearchFilters,
): Promise<LocalDocument[]> {
  let docs = await listDocuments()

  const lower = (v: string | null | undefined) => (v ?? '').toLowerCase()
  const includes = (field: string | null, term: string) =>
    lower(field).includes(term.toLowerCase())

  if (filters.documentNumber) {
    docs = docs.filter((d) => includes(d.document_number, filters.documentNumber!))
  }
  if (filters.sender) {
    docs = docs.filter((d) => includes(d.sender, filters.sender!))
  }
  if (filters.subject) {
    docs = docs.filter((d) => includes(d.subject, filters.subject!))
  }
  if (filters.dateFrom) {
    docs = docs.filter((d) => !!d.document_date && d.document_date >= filters.dateFrom!)
  }
  if (filters.dateTo) {
    docs = docs.filter((d) => !!d.document_date && d.document_date <= filters.dateTo!)
  }

  const trimmed = query.trim()
  if (trimmed) {
    const q = trimmed.toLowerCase()
    docs = docs.filter(
      (d) =>
        includes(d.document_number, q) ||
        includes(d.sender, q) ||
        includes(d.subject, q) ||
        includes(d.summary, q) ||
        includes(d.extracted_text, q),
    )
  }

  // Sort by document_date descending; records with no date go last
  docs.sort((a, b) => {
    if (!a.document_date && !b.document_date) return 0
    if (!a.document_date) return 1
    if (!b.document_date) return -1
    return b.document_date.localeCompare(a.document_date)
  })

  return docs
}
