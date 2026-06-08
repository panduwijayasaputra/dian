# Tasks: PDF Extraction Quality Validation (WO-011 Amendment — D-012)

Based on: `docs/prd/prd-pdf-extraction-quality-validation.md`

## Relevant Files

- `prisma/schema.prisma` - Add `ExtractionStatus` enum and `extractionStatus` field to Document model.
- `src/app/(app)/documents/actions.ts` - Refactor `extractDocumentMetadata` to validate vision output with `isGarbled`, set `extractionStatus`, and gate summary/chunking/embedding on `completed` status. Update `syncDocuments` to include `extractionStatus` in the payload.
- `src/lib/idb.ts` - Add `extraction_status` to `LocalDocument` interface; restrict offline full-text search to `completed` documents; bump IDB version to 4.
- `src/app/(app)/search/actions.ts` - Add `extractionStatus = 'completed'` condition to `semanticSearch` and `hybridSearch` WHERE clauses.
- `src/components/documents/documents-view.tsx` - Add `extractionStatus` to `DocumentModel` type; capture extraction status when opening the viewer.
- `src/components/documents/document-viewer-modal.tsx` - Add `extractionStatus` prop; render warning banner when status is `failed` or `manual_only`.

### Notes

- Use `pnpm test` to run the full test suite after all sub-tasks under a parent task are complete.
- `ExtractionStatus` enum values are lowercase snake_case (`pending`, `completed`, `failed`, `manual_only`) to match the project update doc convention. Note this differs from `EmbeddingStatus` which uses SCREAMING_SNAKE_CASE.
- The IDB version bump (2→3→4) does not require structural store changes — new fields on `LocalDocument` are additive and read-safe for old records.
- After schema changes, run `pnpm prisma generate` explicitly if the dev server reports unknown fields — `migrate dev` does not always hot-reload the generated client in the running process.

---

## Tasks

- [x] 1.0 Add `extractionStatus` to Prisma schema and run migration
  - [x] 1.1 Add `ExtractionStatus` enum to `prisma/schema.prisma`
    - Open `prisma/schema.prisma`.
    - After the `EmbeddingStatus` enum (around line 37), add a new enum:
      ```prisma
      enum ExtractionStatus {
        pending
        completed
        failed
        manual_only
      }
      ```
  - [x] 1.2 Add `extractionStatus` field to the `Document` model
    - In the `Document` model, add the field directly below `embeddingStatus`:
      ```prisma
      extractionStatus ExtractionStatus @default(pending)
      ```
  - [x] 1.3 Create and apply the database migration
    - Run: `pnpm prisma migrate dev --name add_extraction_status`
    - Verify that a new migration folder appears in `prisma/migrations/`.
    - Verify the Prisma client regenerates without errors (the command does this automatically).
    - Confirm that documents already in the database default to `pending`.

- [x] 2.0 Refactor extraction pipeline to apply quality validation gate and set `extractionStatus`
  - [x] 2.1 Add `isGarbled` validation to vision fallback output
    - In `src/app/(app)/documents/actions.ts`, find the `extractDocumentMetadata` function (line 54).
    - Inside the `if (garbled)` block, after receiving `vision.text`, call `isGarbled(vision.text)`:
      - If `vision.text.length > 0` **AND** `!isGarbled(vision.text)` → vision passed, use vision text as `extractedText` and use `vision.result` for metadata.
      - If `vision.text.length === 0` **OR** `isGarbled(vision.text)` → vision also failed, set `extractedText = null` and fall back to `extractMetadataFromText(rawText)` for the pre-fill suggestion only.
  - [x] 2.2 Determine `extractionStatus` based on all validation outcomes
    - Declare `let extractionStatus: 'pending' | 'completed' | 'failed' | 'manual_only' = 'pending'` at the top of the function body.
    - Set the status according to these rules:
      - Primary text passes `isGarbled` check (`!garbled`) → `extractionStatus = 'completed'`
      - Primary garbled, vision text exists and passes → `extractionStatus = 'completed'`
      - Primary garbled, vision text garbled or empty → `extractionStatus = 'manual_only'`
      - Primary garbled, buffer not available from R2 → `extractionStatus = 'failed'`
    - This determination must happen before any AI processing steps.
  - [x] 2.3 Gate summary generation on `extractionStatus === 'completed'`
    - Find the `const summary = await generateSummary(extractedText)` call (line 101).
    - Wrap it: `const summary = extractionStatus === 'completed' ? await generateSummary(extractedText) : null`
  - [x] 2.4 Gate document chunking on `extractionStatus === 'completed'`
    - Find the `const chunks = chunkText(extractedText)` block (line 113).
    - Wrap the entire chunking block in `if (extractionStatus === 'completed') { ... }`.
  - [x] 2.5 Gate embedding generation on `extractionStatus === 'completed'`
    - Find the embedding try/catch block (line 124).
    - Wrap the entire block in `if (extractionStatus === 'completed') { ... }`.
  - [x] 2.6 Persist `extractionStatus` in the database update
    - In the `prisma.document.update` call that saves `extractedText`, `summary`, and `status: 'REVIEW'` (around line 103), add `extractionStatus` to the `data` object:
      ```typescript
      data: {
        extractedText: extractedText || null,
        extractionResult: result as object,
        summary,
        status: 'REVIEW',
        extractionStatus,
      }
      ```

- [x] 3.0 Add `extractionStatus` to IndexedDB sync and restrict offline search
  - [x] 3.1 Add `extraction_status` to `LocalDocument` in `src/lib/idb.ts`
    - In the `LocalDocument` interface, add the field after `extracted_text`:
      ```typescript
      extraction_status: 'pending' | 'completed' | 'failed' | 'manual_only'
      ```
  - [x] 3.2 Restrict full-text search to `completed` documents in `queryDocuments`
    - In `queryDocuments`, find the `trimmed` query block (around line 116).
    - The existing filter checks `extracted_text` for all documents. Update it so that `extracted_text` is only searched when `d.extraction_status === 'completed'`:
      ```typescript
      docs = docs.filter(
        (d) =>
          includes(d.document_number, q) ||
          includes(d.sender, q) ||
          includes(d.subject, q) ||
          includes(d.summary, q) ||
          (d.extraction_status === 'completed' && includes(d.extracted_text, q)),
      )
      ```
  - [x] 3.3 Update `syncDocuments` in `src/app/(app)/documents/actions.ts` to include `extractionStatus`
    - In the `syncDocuments` server action (around line 300), add `extractionStatus: true` to the Prisma `select` clause.
    - In the `LocalDocument` mapping (around line 328), add:
      ```typescript
      extraction_status: doc.extractionStatus,
      ```
  - [x] 3.4 Bump the IDB version to 4 in `openDB`
    - In `src/lib/idb.ts`, change `idbOpen<DianDB>('dian-db', 3, ...)` to version `4`.
    - In the `upgrade` callback, add a comment for version 4:
      ```typescript
      // v4: extraction_status field added to LocalDocument — no structural store change needed.
      ```
    - Existing records without this field will have `extraction_status` as `undefined`; update the `queryDocuments` filter to treat `undefined` as `'pending'` using `(d.extraction_status ?? 'pending')`.

- [x] 4.0 Display extraction quality warning banner on document view page
  - [x] 4.1 Add `extractionStatus` to `DocumentModel` in `src/components/documents/documents-view.tsx`
    - In the `DocumentModel` type (around line 14), add:
      ```typescript
      extractionStatus: 'pending' | 'completed' | 'failed' | 'manual_only'
      ```
    - This type is a local view model — the field will be populated from the server action that fetches documents for the page.
  - [x] 4.2 Pass `extractionStatus` when opening the viewer
    - Change the `viewerId` state from `string | null` to:
      ```typescript
      const [viewerDoc, setViewerDoc] = useState<{ id: string; extractionStatus: string } | null>(null)
      ```
    - Update the `onView` callback passed to `DocumentsTable`:
      ```typescript
      onView={(id) => {
        const doc = documents.find((d) => d.id === id)
        setViewerDoc(doc ? { id, extractionStatus: doc.extractionStatus } : { id, extractionStatus: 'pending' })
      }}
      ```
    - Update `DocumentViewerModal` usage to use `viewerDoc`:
      ```tsx
      <DocumentViewerModal
        documentId={viewerDoc?.id ?? null}
        isOpen={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
        extractionStatus={viewerDoc?.extractionStatus}
      />
      ```
  - [x] 4.3 Add `extractionStatus` prop and warning banner to `DocumentViewerModal`
    - In `src/components/documents/document-viewer-modal.tsx`, add `extractionStatus?: string` to `DocumentViewerModalProps`.
    - Inside the `DialogHeader`, below `<DialogTitle>`, add the banner conditionally:
      ```tsx
      {(extractionStatus === 'failed' || extractionStatus === 'manual_only') && (
        <p className="text-sm text-amber-600 mt-1">
          Kualitas ekstraksi teks rendah. Dokumen ini mungkin menggunakan font atau encoding yang tidak didukung. Harap periksa dan masukkan metadata secara manual.
        </p>
      )}
      ```
    - (Indonesian translation of the prescribed UI message from the PRD.)
  - [x] 4.4 Ensure `extractionStatus` is included in the server-side document fetch for the documents page
    - Find where the documents page fetches the list of `DocumentModel` objects (likely in `src/app/(app)/documents/page.tsx` or the layout server action).
    - Confirm `extractionStatus` is selected in the Prisma query and passed through to `DocumentsView`.

- [x] 5.0 Restrict online search results for `failed` and `manual_only` documents
  - [x] 5.1 Add extraction status guard to `semanticSearch`
    - In `src/app/(app)/search/actions.ts`, in both the admin and non-admin branches of `semanticSearch`, add `AND d."extractionStatus" = 'completed'` to the raw SQL WHERE clause, before the embedding condition:
      ```sql
      WHERE d."extractionStatus" = 'completed'
        AND dc.embedding IS NOT NULL
        AND 1 - (dc.embedding <=> ...) >= ...
      ```
  - [x] 5.2 Add extraction status guard to `hybridSearch`
    - In `hybridSearch`, add `d."extractionStatus" = 'completed'` to the `conditions` array, before the embedding condition:
      ```typescript
      const conditions: string[] = [
        `d."extractionStatus" = 'completed'`,
        `dc.embedding IS NOT NULL`,
        ...
      ]
      ```
    - This ensures that even if a garbled document somehow has orphaned chunk records, it will not appear in semantic or hybrid search results.
  - [x] 5.3 Verify `metadataSearch` requires no changes
    - `metadataSearch` only filters by structured metadata fields and does not use `extractedText` or embeddings. Confirm that garbled documents appear here (they should — metadata search is allowed for all extraction statuses per the PRD).
