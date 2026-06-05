# Tasks: Phase 4 — AI Processing Pipeline

Based on [prd-phase-4-ai-processing.md](../prd/prd-phase-4-ai-processing.md)

## Relevant Files

- `prisma/schema.prisma` — Add `summary`, `embeddingStatus`, `EmbeddingStatus` enum, and `DocumentChunk` model
- `prisma/migrations/` — New migration for Phase 4 schema changes
- `src/lib/generate-summary.ts` — New: OpenAI summary generation function
- `src/lib/chunk-text.ts` — New: Pure text chunking utility (no external deps)
- `src/lib/generate-embeddings.ts` — New: OpenAI embedding generation function
- `src/app/(app)/documents/actions.ts` — Extend `extractDocumentMetadata` to run the Phase 4 pipeline and return full document payload
- `src/components/documents/status-badge.tsx` — Add `embeddingStatus` badge variant
- `src/components/documents/documents-table.tsx` — Add embedding status column to document table

### Notes

- The Phase 4 pipeline runs inside the existing `extractDocumentMetadata` server action in `src/app/(app)/documents/actions.ts`. No new API routes are needed.
- All OpenAI calls must be server-side only (`import 'server-only'` at the top of each lib file).
- Each processing step must be wrapped in try/catch — failures update the relevant field to `null` or `FAILED` but must never throw and block the upload.
- Use `pnpm prisma migrate dev` to run migrations.
- Use `pnpm test` to run the test suite after each parent task.

---

## Tasks

- [x] 1.0 Extend database schema for Phase 4 fields
  - [x] 1.1 Add `EmbeddingStatus` enum to `prisma/schema.prisma`
    - Open `prisma/schema.prisma`
    - Add a new enum after the existing `DocumentType` enum:
      ```prisma
      enum EmbeddingStatus {
        PENDING
        PROCESSING
        COMPLETED
        FAILED
      }
      ```
  - [x] 1.2 Add `summary` and `embeddingStatus` fields to the `Document` model
    - In `prisma/schema.prisma`, inside the `Document` model, add after `extractionResult`:
      ```prisma
      summary         String?
      embeddingStatus EmbeddingStatus @default(PENDING)
      chunks          DocumentChunk[]
      ```
  - [x] 1.3 Add the `DocumentChunk` model
    - In `prisma/schema.prisma`, add a new model after `Document`:
      ```prisma
      model DocumentChunk {
        id         String                  @id @default(cuid())
        documentId String
        document   Document                @relation(fields: [documentId], references: [id], onDelete: Cascade)
        content    String
        chunkIndex Int
        embedding  Unsupported("vector(1536)")?
        createdAt  DateTime                @default(now())
      }
      ```
  - [x] 1.4 Run the migration
    - Run: `pnpm prisma migrate dev --name phase-4-ai-processing`
    - Verify the migration completes without errors
    - Verify the Prisma client is regenerated (it runs automatically after migrate dev)

- [ ] 2.0 Ensure extractedText is in the document return payload (WO-011)
  - [x] 2.1 Update `extractDocumentMetadata` to return the full document alongside the extraction result
    - In `src/app/(app)/documents/actions.ts`, change the `ExtractResult` type to include the full document:
      ```ts
      type ExtractResult =
        | { success: true; result: ExtractionResult; document: Document }
        | { success: false; error: string }
      ```
    - After the final `prisma.document.update(...)` call in `extractDocumentMetadata`, fetch the updated document and include it in the return value:
      ```ts
      const updated = await prisma.document.findUnique({ where: { id: documentId } })
      return { success: true, result, document: updated! }
      ```
    - Update any callers of `extractDocumentMetadata` (in `src/components/documents/metadata-review-sheet.tsx`) to handle the new return shape — the `document` field can be ignored for now; it is there for future IndexedDB sync in Phase 6.
  - [x] 2.2 Update `saveDocumentMetadata` to return the saved document
    - Change `SimpleResult` return type for `saveDocumentMetadata` to:
      ```ts
      type SaveResult =
        | { success: true; document: Document }
        | { success: false; error: string }
      ```
    - After the `prisma.document.update(...)` call, return the updated document. Callers in `metadata-review-sheet.tsx` can ignore the `document` field for now.

- [ ] 3.0 Generate and store document summary via OpenAI (WO-012)
  - [ ] 3.1 Create `src/lib/generate-summary.ts`
    - Create a new file with `import 'server-only'` at the top
    - Export an async function `generateSummary(text: string): Promise<string | null>`
    - If `text.trim()` is empty, return `null` immediately
    - Call OpenAI `gpt-4o-mini` chat completion with a system prompt that instructs it to produce a factual, neutral 2–3 sentence abstract in the same language as the document
    - Pass `text.slice(0, 8000)` as the user message (enough content for a good summary, avoids token limit issues)
    - Return the response string trimmed, or `null` if the call throws
    - Wrap the entire OpenAI call in try/catch — on any error, return `null`
    - Example system prompt:
      ```
      You are a document summarizer for government correspondence.
      Write a factual, neutral 2–3 sentence abstract of the document's main content.
      Use the same language as the document. Do not add opinions or recommendations.
      ```
  - [ ] 3.2 Call `generateSummary` inside `extractDocumentMetadata`
    - In `src/app/(app)/documents/actions.ts`, import `generateSummary` from `@/lib/generate-summary`
    - After the existing `extractTextFromR2` and `extractMetadataFromText` calls, add:
      ```ts
      const summary = await generateSummary(text)
      ```
    - Include `summary` in the `prisma.document.update(...)` data payload alongside `extractedText` and `extractionResult`
    - This call is already inside the action — if it throws (which it won't, due to the try/catch in the lib), the action will still continue due to the outer structure

- [ ] 4.0 Implement document chunking (WO-013)
  - [ ] 4.1 Create `src/lib/chunk-text.ts`
    - Create a new file (no `server-only` needed — this is a pure utility)
    - Export a function `chunkText(text: string): string[]`
    - Define constants: `CHUNK_SIZE = 2000` (characters, ≈ 500 tokens) and `OVERLAP = 400` (characters, ≈ 100 tokens)
    - If `text.trim()` is empty, return `[]`
    - Use a sliding window loop:
      ```ts
      const chunks: string[] = []
      let start = 0
      while (start < text.length) {
        chunks.push(text.slice(start, start + CHUNK_SIZE))
        start += CHUNK_SIZE - OVERLAP
      }
      return chunks
      ```
    - This produces no external dependencies and no async calls
  - [ ] 4.2 Call `chunkText` and store `DocumentChunk` records inside `extractDocumentMetadata`
    - Import `chunkText` from `@/lib/chunk-text` in `src/app/(app)/documents/actions.ts`
    - After the summary generation step, add:
      ```ts
      const chunks = chunkText(text)
      if (chunks.length > 0) {
        await prisma.documentChunk.createMany({
          data: chunks.map((content, chunkIndex) => ({
            documentId,
            content,
            chunkIndex,
          })),
        })
      }
      ```
    - Wrap in try/catch — if `createMany` fails, log the error and continue (do not throw)

- [ ] 5.0 Generate and store vector embeddings with pgvector (WO-014–015)
  - [ ] 5.1 Create `src/lib/generate-embeddings.ts`
    - Create a new file with `import 'server-only'` at the top
    - Export an async function `generateEmbedding(text: string): Promise<number[] | null>`
    - Call OpenAI `text-embedding-3-small` with the given text as input
    - Return the embedding array from `response.data[0].embedding`, or `null` on any error
    - Wrap in try/catch — on any error, log and return `null`
  - [ ] 5.2 Call `generateEmbedding` for each chunk inside `extractDocumentMetadata`
    - After the chunking step, set `embeddingStatus` to `PROCESSING`:
      ```ts
      await prisma.document.update({
        where: { id: documentId },
        data: { embeddingStatus: 'PROCESSING' },
      })
      ```
    - Fetch the created chunks with their ids:
      ```ts
      const storedChunks = await prisma.documentChunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
      })
      ```
    - For each chunk, call `generateEmbedding(chunk.content)` and if the result is not null, update the chunk using a raw query (pgvector requires raw SQL for vector writes):
      ```ts
      await prisma.$executeRaw`
        UPDATE "DocumentChunk"
        SET embedding = ${JSON.stringify(vector)}::vector
        WHERE id = ${chunk.id}
      `
      ```
    - Track whether at least one embedding succeeded. After the loop:
      - If all embeddings are null: set `embeddingStatus: 'FAILED'`
      - Otherwise: set `embeddingStatus: 'COMPLETED'`
    - Wrap the entire embedding loop in try/catch — on unexpected error, set `embeddingStatus: 'FAILED'` and continue
  - [ ] 5.3 Add `embeddingStatus` badge to the documents table
    - In `src/components/documents/status-badge.tsx`, add a new exported component `EmbeddingStatusBadge` that renders the `embeddingStatus` value using the same shadcn `Badge` pattern as `ExtractionStatusBadge`
    - Map statuses to badge variants:
      - `PENDING` → secondary
      - `PROCESSING` → outline (with a loading indicator or just label)
      - `COMPLETED` → default (green)
      - `FAILED` → destructive
    - In `src/components/documents/documents-table.tsx`, add an "Embedding" column using `EmbeddingStatusBadge` — place it next to the existing extraction status column
    - Ensure the `documents` query in `src/app/(app)/documents/page.tsx` selects `embeddingStatus`
