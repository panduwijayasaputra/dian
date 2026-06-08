# PRD: Phase 4 — AI Processing Pipeline

## 1. Introduction / Overview

Phase 4 builds the AI processing pipeline that transforms stored documents into searchable, semantically indexed records. It covers four work orders: PDF text extraction sync (WO-011), summary generation (WO-012), document chunking (WO-013), and embedding generation with vector storage (WO-014–015).

After Phase 3, documents have extracted metadata and raw text stored in PostgreSQL. Phase 4 ensures that text is available for offline search, generates human-readable summaries, and creates vector embeddings that power semantic search in Phase 5.

**Goal:** Every successfully uploaded document is summarized, chunked, and embedded in a single synchronous pipeline — making it findable both offline (by keyword) and online (by meaning).

---

## 2. Goals

1. Sync extracted text to IndexedDB so offline full-text search works.
2. Generate a 2–3 sentence AI summary for every document and store it for display and offline search.
3. Split document text into chunks for granular embedding.
4. Generate and store vector embeddings per chunk using pgvector.
5. Ensure every processing failure is isolated — no failure in Phase 4 blocks document storage or metadata review.

---

## 3. User Stories

- As a staff member, I want to search for a document by keyword while offline, so that I can retrieve it without an internet connection.
- As a staff member, I want to see a short summary of each document, so that I can quickly confirm it is the one I need without opening it.
- As a staff member, I want semantic search to understand what I mean — not just match exact words — so that I can find documents even when I forget the exact wording.
- As a staff member, I want failed AI processing to not block my document from being saved, so that I never lose work due to an API error.

---

## 4. Functional Requirements

### WO-011 — PDF Text Extraction (IndexedDB Sync)

1. The `extractedText` field on the Document model must be included in the IndexedDB sync payload sent to the client after upload.
2. The offline search implementation must support full-text keyword matching against `extractedText`.
3. If text extraction fails, document storage and metadata review must proceed normally — `extractedText` remains `null`.
4. Documents with `extractedText: null` must still be searchable by metadata fields (document number, sender, subject, date) offline.

### WO-012 — Summary Generation

5. After text extraction completes, the system must call OpenAI to generate a 2–3 sentence abstract summarizing the document's main content.
6. The summary must be stored in a new nullable `summary` field (`String?`) on the Document model.
7. The summary must be included in the IndexedDB sync payload for offline display.
8. If summary generation fails (API error, timeout, no extracted text), the document must still be saved with `summary: null` — no error is shown to the user.
9. The summary prompt must instruct OpenAI to produce a factual, neutral summary in the same language as the document.

### WO-013 — Document Chunking

10. After text extraction succeeds, the system must split `extractedText` into fixed-size chunks of approximately 500 tokens with approximately 100 tokens of overlap between consecutive chunks.
11. Each chunk must be stored in a new `DocumentChunk` table with fields: `id`, `documentId`, `content`, `chunkIndex`, `createdAt`.
12. If `extractedText` is `null` or empty, no chunks are created — this is not an error state.
13. Chunking must use character-count approximation (1 token ≈ 4 characters) to avoid adding a tokenizer dependency.

### WO-014–015 — Embedding Generation + Vector Storage

14. For each chunk, the system must call OpenAI `text-embedding-3-small` to generate a 1536-dimension vector.
15. Each vector must be stored in an `embedding` field of type `Unsupported("vector(1536)")` on the `DocumentChunk` model using pgvector.
16. A `embeddingStatus` field must be added to the Document model with values: `PENDING | PROCESSING | COMPLETED | FAILED`.
17. `embeddingStatus` must be set to `PROCESSING` at the start of embedding generation, `COMPLETED` when all chunks are embedded, and `FAILED` if any chunk embedding fails after retries.
18. Individual chunk embedding failures must be logged but must not fail the overall upload — failed chunks are skipped.
19. The system must not generate embeddings in the browser — all OpenAI embedding calls occur server-side only.

---

## 5. Non-Goals (Out of Scope)

- OCR — not part of MVP (D-003).
- Embedding regeneration after metadata edits — can be added post-MVP.
- Background/async queue processing — pipeline runs synchronously during upload.
- Per-chunk retry logic with exponential backoff — basic error isolation is sufficient for MVP.
- Streaming progress updates during processing — upload completes as a single response.
- Support for non-PDF document types.

---

## 6. Design Considerations

- The Phase 4 pipeline extends the existing upload server action in sequence: Extract Text → Generate Summary → Chunk Text → Generate Embeddings.
- Processing status is visible to the user via the existing `extractionStatus` badge pattern from Phase 3. A new `embeddingStatus` badge follows the same pattern.
- Summary is displayed in the document card or detail view — exact placement to be determined during implementation.
- No new upload UI is required — this phase is entirely backend pipeline work.

---

## 7. Technical Considerations

### Schema Changes

```prisma
model Document {
  // existing fields...
  summary         String?
  embeddingStatus EmbeddingStatus @default(PENDING)
  chunks          DocumentChunk[]
}

model DocumentChunk {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content     String
  chunkIndex  Int
  embedding   Unsupported("vector(1536)")?
  createdAt   DateTime @default(now())
}

enum EmbeddingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### Pipeline Order (within existing upload action)

1. Upload PDF → R2 (existing)
2. Extract text via PDF parser (existing, WO-008)
3. Extract metadata via OpenAI (existing, WO-008)
4. **[NEW] Sync extractedText to IndexedDB payload** (WO-011)
5. **[NEW] Generate summary via OpenAI** (WO-012)
6. **[NEW] Chunk extractedText** (WO-013)
7. **[NEW] Generate embeddings via OpenAI** (WO-014–015)
8. Return document to client → sync to IndexedDB

### OpenAI Models

| Task | Model | Notes |
|------|-------|-------|
| Summary | `gpt-4o-mini` | Cost-effective for short summaries |
| Embeddings | `text-embedding-3-small` | 1536 dimensions, best cost/quality for MVP |

### Chunking Strategy

- Chunk size: ~500 tokens (≈ 2000 characters)
- Overlap: ~100 tokens (≈ 400 characters)
- Implementation: pure string slicing, no tokenizer library needed

---

## 8. Success Metrics

- Every document with extractable text has a non-null `summary` after upload.
- Every document with extractable text has at least one `DocumentChunk` with a stored embedding after upload.
- Offline keyword search returns results from `extractedText` for documents synced while online.
- A document with a failed summary or embedding still appears in the documents list with correct metadata.
- No upload fails due to a Phase 4 processing error.

---

## 9. Open Questions

- Should the summary be displayed in the document table row, or only in the document detail/viewer? (To be decided during WO-012 implementation.)
- Should `embeddingStatus: FAILED` surface any user-facing indicator, or is it only for internal monitoring? (To be decided during WO-014 implementation.)
- What is the maximum `extractedText` length we should attempt to chunk and embed? Very long documents may hit OpenAI rate limits. (Suggest a cap of 100,000 characters for MVP — to be confirmed.)
