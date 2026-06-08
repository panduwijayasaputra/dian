# PRD: PDF Extraction Quality Validation (WO-011 Amendment — D-012)

## 1. Introduction / Overview

This document amends WO-011 (PDF Text Extraction) to add an extraction quality validation gate before AI processing.

Some PDFs contain corrupted or unmappable character encodings. When these documents are processed, the extracted text appears garbled — unintelligible sequences of characters that produce inaccurate summaries, incorrect metadata, bad embeddings, and broken search results.

Decision D-012 requires that extraction quality is validated before any AI processing begins. Documents that fail validation must not proceed to summary generation, chunking, or embedding. Instead, they enter a manual metadata workflow where staff enter document metadata directly.

**Goal:** Ensure that only high-quality extracted text reaches the AI pipeline, while keeping document storage, offline sync, and the manual metadata workflow fully functional regardless of extraction outcome.

---

## 2. Goals

1. Validate extracted text quality using the existing `isGarbled` detection in `src/lib/pdf.ts` before any AI processing step.
2. Use vision-based extraction (OpenAI) as an automatic fallback when primary text extraction is garbled.
3. Set extraction status to `manual_only` when both primary and vision extraction fail quality validation.
4. Block garbled text from reaching summary generation, document chunking, and embedding generation.
5. Preserve document storage and offline sync regardless of extraction outcome.
6. Display a clear UI message on the document view page when extraction quality is too low.
7. Restrict search capabilities for `failed` and `manual_only` documents to metadata-only search.

---

## 3. User Stories

- As a staff member, I want the system to warn me when a document's text could not be reliably extracted, so that I know I need to enter metadata manually.
- As a staff member, I want a failed extraction to not prevent me from saving the document, so that I do not lose my upload.
- As a staff member, I want a failed extraction to not prevent the document from syncing offline, so that I can still access it without internet.
- As a staff member, I want to search for any document by its metadata fields, even if the text extraction failed, so that I can still find it.
- As an administrator, I want AI-generated summaries and search embeddings to only be created from reliable text, so that search results are accurate.

---

## 4. Functional Requirements

### 4.1 Extraction Status Field

1. A new `extractionStatus` field must be added to the `Document` model with the following values: `pending | completed | failed | manual_only`.
2. `extractionStatus` must default to `pending` when a document is created.
3. Status transitions are:
   - `pending → completed` — primary text extraction passed quality validation.
   - `pending → failed` — primary text extraction failed; vision fallback also failed or is unavailable.
   - `pending → completed` — primary text extraction was garbled, but vision fallback produced quality text.
   - `completed (via vision) or failed → manual_only` — set only when both primary text extraction and vision fallback produce garbled output.

### 4.2 Quality Validation Step

4. After primary text extraction, the system must call the existing `isGarbled` function from `src/lib/pdf.ts` on the extracted text.
5. If `isGarbled` returns `false`, the text passes validation. `extractionStatus` is set to `completed` and AI processing proceeds.
6. If `isGarbled` returns `true`, the text fails validation. The system must automatically attempt vision-based extraction as a fallback (see §4.3).

### 4.3 Vision Extraction Fallback

7. When primary extraction is garbled, the system must invoke the existing vision extraction pipeline (OpenAI Files API + Responses API).
8. The resulting vision text must also be validated using `isGarbled`.
9. If vision text passes validation (`isGarbled` returns `false`), `extractionStatus` is set to `completed`. The vision-derived text is used as `extractedText`. AI processing proceeds normally.
10. If vision text also fails validation, `extractionStatus` is set to `manual_only`. `extractedText` is set to `null`. AI processing is skipped entirely.

### 4.4 AI Processing Gate

11. Summary generation (WO-012) must only run when `extractionStatus` is `completed`.
12. Document chunking (WO-013) must only run when `extractionStatus` is `completed`.
13. Embedding generation (WO-014–015) must only run when `extractionStatus` is `completed`.
14. If `extractionStatus` is `failed` or `manual_only`, steps 11–13 are skipped without error.

### 4.5 Document Storage and Offline Sync

15. Document storage must not be blocked by any extraction outcome. The document is always saved to PostgreSQL and R2 regardless of `extractionStatus`.
16. IndexedDB sync must include `extractionStatus` in the sync payload so offline clients can apply the correct search behavior.
17. Offline sync must not be blocked by any extraction outcome.

### 4.6 Manual Metadata Workflow

18. When `extractionStatus` is `manual_only`, the document must route to the manual metadata form for staff to fill in document fields by hand.
19. Manual metadata entry (document number, document date, sender, subject) must function normally regardless of extraction status.
20. Notes and Timeline must remain available for all documents regardless of extraction status.

### 4.7 UI — Document View Page

21. When `extractionStatus` is `failed` or `manual_only`, the document view/detail page must display the following message:

    > "Text extraction quality is low. This document may use unsupported fonts or encodings. Please review and enter metadata manually."

22. This message must not appear when `extractionStatus` is `completed` or `pending`.

### 4.8 Search Restrictions

23. Documents with `extractionStatus: completed` support all search types: metadata filtering, full-text search, semantic search, and natural language search.
24. Documents with `extractionStatus: failed` or `manual_only` support metadata search only (document number, sender, subject, date).
25. Offline search must enforce the same restrictions using the `extractionStatus` value stored in IndexedDB.

---

## 5. Non-Goals (Out of Scope)

- OCR — not part of MVP (D-003). Vision extraction is not OCR; it uses OpenAI's vision model on rendered PDF images.
- Manual override to re-run extraction — staff cannot trigger a re-extraction from the UI in this release.
- Admin tools to monitor extraction failure rates — deferred post-MVP.
- Partial extraction — the system does not attempt to combine text from pages that passed with pages that failed. The whole document either passes or fails.
- Reprocessing `manual_only` documents automatically when the document is re-uploaded — out of scope.

---

## 6. Design Considerations

- The quality validation step is inserted between primary text extraction and the AI processing steps in the existing upload server action.
- The updated pipeline order is:
  1. Upload PDF → R2 (existing)
  2. Extract text via PDF parser (existing)
  3. **[NEW] Validate quality via `isGarbled`**
  4. **[NEW] Vision fallback if garbled** (existing vision pipeline, now gated by validation)
  5. **[NEW] Set `extractionStatus`**
  6. Sync `extractedText` + `extractionStatus` to IndexedDB payload
  7. Generate summary (WO-012) — only if `extractionStatus: completed`
  8. Chunk text (WO-013) — only if `extractionStatus: completed`
  9. Generate embeddings (WO-014–015) — only if `extractionStatus: completed`
  10. Return document to client
- The UI message on the document view page follows the existing alert/banner pattern used elsewhere in the app.
- No new upload UI screens are required.

---

## 7. Technical Considerations

### Schema Changes

```prisma
enum ExtractionStatus {
  pending
  completed
  failed
  manual_only
}

model Document {
  // existing fields...
  extractionStatus ExtractionStatus @default(pending)
}
```

### Key Functions (already in src/lib/pdf.ts)

| Function | Purpose |
|---|---|
| `isGarbled(text)` | Returns `true` if text fails quality check |
| `extractFromPDFVision(...)` | Extracts text via OpenAI vision on PDF images |
| `getBufferFromR2(key)` | Fetches the PDF buffer from R2 for vision processing |

### IndexedDB Sync

- Add `extractionStatus` to the document sync payload returned from the upload action.
- Update the IDB document schema to store `extractionStatus`.
- Update offline search logic to check `extractionStatus` before applying full-text matching.

---

## 8. Success Metrics

- A document with garbled text does not produce a summary, chunks, or embeddings after upload.
- A document where vision fallback succeeds is fully AI-processed and searchable.
- A document where both extraction methods fail still appears in the documents list with correct manually-entered metadata.
- The UI message appears on the document view page for every `failed` or `manual_only` document.
- Offline search returns `manual_only` documents only when searching by metadata fields — not by full-text.
- No upload fails due to extraction quality validation.

---

## 9. Open Questions

- Should `extractionStatus: failed` be a permanent state, or should the system automatically retry vision extraction on a subsequent sync? (Recommend permanent for MVP — staff re-uploads if needed.)
- If vision extraction is skipped for a `completed` document (text passed primary validation), should vision ever be run as a quality improvement? (Out of scope for this release.)
- What is the fallback when vision extraction itself throws a runtime error (not a quality failure, but an API error)? Does this result in `failed` or `manual_only`? (Recommend `failed` — `manual_only` is reserved for quality failures specifically.)
