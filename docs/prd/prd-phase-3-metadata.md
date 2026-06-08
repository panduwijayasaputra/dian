# PRD: Phase 3 — Metadata

**Work Orders:** WO-007 (Metadata Schema), WO-008 (Metadata Extraction), WO-009 (Metadata Review), WO-010 (Metadata Editing)
**Phase:** 3
**Status:** Draft

---

## 1. Introduction / Overview

Phase 3 makes uploaded documents meaningful and searchable. After a PDF is uploaded and stored in R2 (Phase 2), it has no structured data attached to it — just a file. This phase extracts and captures the five key metadata fields that describe every government document, allows staff to verify and correct them before the document is saved, and gives staff a way to edit that metadata later.

Without metadata, search (Phase 5) cannot work. This phase is the prerequisite for all AI processing and search phases.

**Goal:** Every document stored in DIAN has accurate, human-verified metadata that was either extracted by AI or entered manually — before the document becomes searchable.

---

## 2. Goals

1. Define and migrate a stable metadata schema with five fields on the `documents` table (WO-007).
2. Automatically extract metadata from uploaded PDFs using the OpenAI API when the user is online (WO-008).
3. Show a metadata review modal/drawer after every upload, which must be completed before the document is saved (WO-009).
4. Display AI-suggested field values with per-field confidence indicators and an "AI-suggested" label (WO-009).
5. Allow staff to edit metadata at any point after saving via a document settings page (WO-010).

---

## 3. User Stories

**Metadata Schema**
- As a developer, I want the metadata schema to be defined in a migration so that all environments stay in sync.

**Metadata Extraction**
- As a staff member, I want AI to pre-fill the metadata fields after I upload a document so that I do not have to type everything manually.
- As a staff member, I want extraction to run automatically when I am online so that I don't need to trigger it myself.
- As a staff member, I want extraction failures to be handled gracefully so that I can still manually enter metadata and save the document.

**Metadata Review**
- As a staff member, I want a review modal to appear after every upload so that I can verify what the AI extracted before the document is saved.
- As a staff member, I want to see a confidence label (High / Medium / Low) next to each AI-suggested field so that I know which values I should double-check.
- As a staff member, I want to correct any wrong values before saving so that the document is never stored with inaccurate metadata.
- As a staff member, I want to enter metadata manually if extraction failed or I am offline so that I can still save the document.

**Metadata Editing**
- As a staff member, I want to open a settings page for any saved document so that I can correct metadata I missed during review.
- As a staff member, I want changes to metadata to take effect immediately so that future searches return the corrected results.

---

## 4. Functional Requirements

### WO-007 — Metadata Schema

1. The `documents` table must include the following metadata fields:
   - `document_number` (text, nullable)
   - `document_date` (date, nullable)
   - `sender` (text, nullable)
   - `subject` (text, nullable)
   - `document_type` (enum, nullable) — values: `Surat Masuk`, `Surat Keluar`, `Nota Dinas`, `Surat Keputusan`, `Lainnya`
2. The schema must be applied via a database migration (e.g., Drizzle migration file).
3. All five fields must be nullable so that documents can exist before metadata review is complete.
4. The `document_type` values must be stored as a PostgreSQL enum type named `document_type_enum`.

### WO-008 — Metadata Extraction

5. After a PDF file is successfully uploaded to R2, the system must attempt to extract metadata automatically if the user is online.
6. Extraction must call the OpenAI API server-side, sending the first N pages of extracted PDF text as context.
7. The extraction prompt must request values for all five fields: `document_number`, `document_date`, `sender`, `subject`, `document_type`.
8. For each field, the API response must include the extracted value and a confidence level: `high`, `medium`, or `low`.
9. Extracted values and their confidence levels must be stored temporarily (e.g., in a server-side response or short-lived database columns) and passed to the review modal.
10. If extraction fails (API error, timeout, or offline), the system must proceed to the review modal with all fields blank — the user must still be able to save the document by entering values manually.
11. Extraction failures must not prevent the document from being saved or displayed in the documents list.
12. Extraction must run as a background step after upload; it must not block the upload response to the client.
13. The document status must transition to `Extracting` during extraction, then to `Review` once extraction completes (success or failure).

### WO-009 — Metadata Review

14. After every upload — regardless of extraction success — a metadata review modal or drawer must appear automatically.
15. The review UI must block further navigation or interaction until the user either submits the form or explicitly cancels (see requirement 22).
16. The review modal must display an editable form with fields for all five metadata fields.
17. Fields pre-filled by AI must display an `AI-suggested` label and a confidence badge:
    - `High` → green badge
    - `Medium` → yellow/amber badge
    - `Low` → red badge
18. Fields that could not be extracted must appear empty and editable.
19. The `document_type` field must render as a dropdown/select using the five enum values from WO-007.
20. The `document_date` field must render as a date picker.
21. `document_number` and `subject` are required fields — the form must not submit if they are empty.
22. A "Save" button must submit the form, save the metadata to the database, and update the document status to `Ready`.
23. A "Cancel" button must be available. Cancelling must discard the document record and delete the file from R2 — no incomplete documents should remain saved.
24. On successful save, the review modal must close and the user must be returned to the `/documents` page where the newly saved document appears with status `Ready`.
25. The review modal must show a loading state while extraction is in progress before the form is rendered.

### WO-010 — Metadata Editing

26. Each row in the documents table must include an action to open the document's settings page.
27. The settings page must be accessible at `/documents/[id]/settings`.
28. The settings page must display the same five-field form used in the review modal, pre-filled with the current saved values.
29. The settings page must not show AI-suggested labels — all fields are treated as user-owned at this point.
30. Submitting the form must update the metadata in the database immediately.
31. On successful save, the user must see a success confirmation (e.g., toast notification) and remain on the settings page.
32. The settings page must be accessible only to authenticated users.

---

## 5. Non-Goals (Out of Scope)

- **OCR:** Text extraction from scanned/image PDFs is WO-011. This phase uses text that is already embedded in the PDF.
- **AI Summary:** Summary generation is WO-012.
- **Embedding generation:** Vector embeddings are WO-014–015.
- **Offline metadata extraction:** AI extraction requires the OpenAI API and is online-only. Offline users must fill in fields manually.
- **Bulk metadata editing:** Editing multiple documents at once is not required for MVP.
- **Metadata history / audit log:** Tracking who changed which field and when is not in scope.
- **Document deletion:** Deleting a saved document is not in scope (only cancelling during review).
- **Custom document_type values:** The five enum values are fixed for MVP; user-defined types are not supported.

---

## 6. Design Considerations

- **Review modal size:** Use a large or full-width modal (shadcn Dialog or Sheet) to give form fields enough space. A Sheet (right-side drawer) is preferred to maintain spatial context with the documents list below.
- **Field layout:** Stack fields vertically, one per row, with the label above the input. Show the AI badge and confidence chip inline to the right of the label.
- **Confidence badge colors:**
  - `High` → green (same style as `Ready` status badge)
  - `Medium` → amber
  - `Low` → red
- **Loading state:** While extraction is in progress, show a skeleton or spinner inside the modal before the form fields appear.
- **Document type select:** Use a shadcn Select component with the five enum values as options.
- **Settings page:** Reuse the same form component as the review modal. The page should follow the existing app shell layout.
- **Cancel confirmation:** When the user clicks Cancel in the review modal, show a brief confirmation prompt ("Cancel upload? The document will be deleted.") before proceeding.

---

## 7. Technical Considerations

- **PDF text for extraction:** Use a server-side PDF parsing library (e.g., `pdf-parse`) to extract raw text from the uploaded PDF before sending to OpenAI. Store this extracted text on the document record for later use in offline search (D-011).
- **OpenAI prompt:** Use a structured output / function-calling approach so the API returns a typed JSON object with field values and confidence scores — not free-form text.
- **Confidence scoring:** If OpenAI structured output does not natively return confidence levels, ask the model to rate each field explicitly in the JSON schema.
- **Temporary extraction results:** Store extraction results (values + confidence) in a dedicated table or as JSONB on the `documents` row under an `extraction_result` column. This avoids passing large payloads through URL params.
- **Status transitions:** Document status flow for this phase: `Processing → Extracting → Review → Ready` (or `Processing → Review → Ready` if extraction is skipped/offline).
- **Database migration:** Add the five metadata columns and the `document_type_enum` type in a single migration. Confirm field names match the existing schema (if any columns were added in Phase 2).
- **Form validation:** Use `react-hook-form` + `zod` consistent with any existing form patterns in the codebase.
- **Settings page route:** `/documents/[id]/settings` — implement as a Next.js App Router page with a Server Action for the update.
- **Reusable form component:** Extract a `MetadataForm` component shared between the review modal (WO-009) and the settings page (WO-010) to avoid duplication.

---

## 8. Success Metrics

- After uploading a PDF online, the review modal appears automatically with AI-suggested values pre-filled within 10 seconds.
- A staff member can complete metadata review and save a document in under 60 seconds.
- Extraction failure (API error, offline) does not prevent a user from saving a document — the empty form is still functional.
- All saved documents in the database have non-null `document_number` and `subject` values.
- A staff member can update metadata from the settings page and confirm the change is reflected in the documents table immediately.

---

## 9. Open Questions

1. **PDF text extraction library:** Should `pdf-parse` be used, or is there a preferred library already in the project? If `pdf-parse` is insufficient for complex PDFs, `pdfjs-dist` (server-side) is the fallback.
2. **Extraction timeout:** What is an acceptable timeout for the OpenAI extraction call before the system falls back to a blank form? (Suggestion: 15 seconds.)
3. **Cancel behavior — R2 cleanup:** When the user cancels the review modal, the file is already in R2. Should deletion from R2 happen synchronously (blocking the cancel action) or asynchronously in the background?
4. **Confidence scoring accuracy:** Should confidence levels be generated by OpenAI (via prompt) or calculated locally (e.g., based on whether the model returned a value or left it null)?
5. **document_type for non-standard documents:** If a document doesn't fit any of the five enum values, should "Lainnya" (Other) trigger a free-text input for the user to specify the type?
6. **Extracted text storage:** Is it acceptable to store the full extracted PDF text in PostgreSQL (as a `text` column), or should long documents be truncated at a character limit for the MVP?
