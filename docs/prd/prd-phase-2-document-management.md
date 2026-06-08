# PRD: Phase 2 — Document Management

**Work Orders:** WO-004 (Cloudflare R2 Integration), WO-005 (Document Upload), WO-006 (Document Viewer)
**Phase:** 2
**Status:** Draft

---

## 1. Introduction / Overview

Phase 2 establishes the document management backbone of DIAN. It enables users to upload PDF documents, store them securely in Cloudflare R2, and view them from a dedicated documents list page.

Without this phase, users have no way to get documents into the system. This phase is the prerequisite for all subsequent phases: metadata extraction, AI processing, and search.

**Goal:** A user can upload a PDF, see it appear in their documents list with a live status, and open it in a viewer — all within a single session.

---

## 2. Goals

1. Integrate Cloudflare R2 as the document storage backend (WO-004).
2. Allow users to upload PDF files via drag-and-drop or file picker (WO-005).
3. Display uploaded documents in a table at `/documents` with live status badges (WO-005, WO-006).
4. Allow users to open any document in a PDF viewer modal from the documents table (WO-006).
5. Reflect the full document lifecycle status in the UI: `Saved Locally → Uploading → Processing → Ready / Error`.

---

## 3. User Stories

**Upload**
- As a staff member, I want to drag a PDF onto the upload area so that I can add a document without clicking through a file browser.
- As a staff member, I want to click a button to browse and select a PDF so that I can upload documents without drag-and-drop support.
- As a staff member, I want to queue the next document while the current one is uploading so that I do not have to wait between uploads.
- As a staff member, I want to see an error message if I upload a non-PDF file so that I understand why the upload was rejected.

**Documents List**
- As a staff member, I want to see all my uploaded documents in a table so that I can track what has been added to the system.
- As a staff member, I want to see the status of each document (Uploading, Processing, Ready, Error) so that I know which ones are ready to use.

**Document Viewer**
- As a staff member, I want to click a "View" button on any document row so that I can read the original PDF without leaving the page.
- As a staff member, I want the PDF to open in a modal so that I can quickly close it and return to the list.

---

## 4. Functional Requirements

### WO-004 — Cloudflare R2 Integration

1. The system must store R2 credentials (account ID, access key, secret key, bucket name, public URL) as environment variables.
2. The system must provide a server-side utility for uploading files to R2 and returning the stored object key.
3. The system must provide a server-side utility for generating presigned/signed URLs to retrieve private R2 objects for viewing.
4. The system must never expose R2 credentials to the browser.
5. The system must store the R2 object key on the document record in the database.

### WO-005 — Document Upload

6. The upload UI must accept PDF files only (`.pdf` MIME type). Any other file type must be rejected with a clear error message.
7. The upload UI must support both drag-and-drop and a click-to-browse file picker.
8. The system must upload one document at a time. A pending queue must allow users to select the next document before the current upload completes.
9. On successful upload, the system must create a document record in PostgreSQL with the R2 object key and an initial status of `Uploading`.
10. After the file is stored in R2, the system must update the document status to `Processing` to signal that the document is ready for the metadata pipeline (Phase 3).
11. After upload, the user must be redirected to or shown the `/documents` page, where the newly uploaded document appears with its current status.
12. Upload progress must be visible to the user (progress indicator or spinner).
13. If an upload fails, the document status must be set to `Error` and the user must see an error message with a retry option.
14. The system must enforce a maximum file size limit (suggest: 20 MB per file). Files exceeding this limit must be rejected before upload begins.

### WO-006 — Document Viewer & List

15. The system must provide a `/documents` page, accessible only to authenticated users.
16. The documents page must display a table with the following columns:
    - Document Number
    - Subject
    - Sender
    - Document Date
    - Status
    - Actions (View button)
17. Status must be displayed as a badge using user-friendly labels:
    - `Saved Locally` — stored in IndexedDB, not yet synced
    - `Uploading` — being transferred to R2
    - `Processing` — uploaded, pending metadata/AI pipeline
    - `Ready` — fully processed and searchable
    - `Error` — upload or processing failed
18. Clicking the "View" button on a document row must open a modal dialog containing the PDF viewer.
19. The PDF viewer must render the document using a presigned URL from R2. The presigned URL must be fetched server-side and not expose the raw R2 bucket path to the client.
20. The viewer modal must have a visible close button to dismiss it.
21. If a document does not yet have a file in R2 (status is `Saved Locally`), the "View" button must be disabled.
22. The documents table must show the most recently uploaded documents first (sorted by upload date descending).

---

## 5. Non-Goals (Out of Scope)

- **OCR:** Text extraction from PDFs is not part of this phase (WO-011).
- **Metadata extraction:** AI-powered metadata extraction is not part of this phase (WO-008).
- **Metadata review UI:** The full review screen is WO-009. This phase only sets the status to `Processing` and shows a placeholder state.
- **Search:** Search functionality is Phases 3–5.
- **Offline upload (IndexedDB):** Offline-first PWA support is Phase 6 (WO-020–022). This phase handles online uploads only. The `Saved Locally` status badge is included in the UI but will not be triggered by this phase.
- **Folder upload or batch multi-file upload:** Users upload one file at a time.
- **Document deletion or archiving.**
- **Document download button** (user can view in the modal; download is not required for MVP).
- **Pagination or filtering** on the documents table (acceptable for MVP with small data sets).

---

## 6. Design Considerations

- **Consistent with existing UI:** Use the app shell, navigation, and shadcn/ui components already established in Phase 1 (WO-003).
- **Upload area:** A clearly marked drop zone (dashed border, icon, and label) that changes appearance on hover/drag-over. Below it, a "Browse files" button as fallback.
- **Status badges:** Color-coded for quick scanning:
  - `Saved Locally` → gray
  - `Uploading` → blue
  - `Processing` → yellow/amber
  - `Ready` → green
  - `Error` → red
- **Viewer modal:** Full-height modal (large breakpoint) to maximize PDF reading area. Close button in the top-right corner.
- **Empty state:** When no documents exist, the table must show an empty state with a prompt to upload the first document.
- **Queue UI:** A small list or counter below the upload area showing queued files, each with a remove option.

---

## 7. Technical Considerations

- **R2 SDK:** Use the `@aws-sdk/client-s3` package with the R2-compatible S3 endpoint (`https://<account-id>.r2.cloudflarestorage.com`). All uploads and signed URL generation happen in Server Actions or API Routes — never in the browser.
- **Presigned URLs:** Generate short-lived presigned GET URLs (e.g., 1-hour expiry) for the viewer. Do not expose the raw R2 object key or bucket URL to the client.
- **PDF rendering:** Use a `<iframe>` or `<embed>` pointing to the presigned URL as the simplest approach. If rendering quality is insufficient, use `react-pdf` (based on PDF.js).
- **Database:** Add an `r2_key` column and a `status` enum column to the `documents` table (to be created in this phase or confirmed against the existing schema).
- **Server Actions:** Prefer Next.js Server Actions over API Routes for the upload flow to keep the implementation simple.
- **File size validation:** Validate on the client before upload begins, and enforce again on the server.
- **Environment variables:** Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` to `.env.local` and document in `.env.example`.

---

## 8. Success Metrics

- A user can upload a valid PDF and see it appear in the `/documents` table within 5 seconds on a standard connection.
- A user can open any `Ready` document in the viewer modal within 2 seconds of clicking "View".
- Upload of an invalid file type (non-PDF) shows an error without attempting to contact R2.
- No R2 credentials or raw bucket URLs are visible in the browser network tab or page source.
- All document records in the database have a corresponding R2 object key after a successful upload.

---

## 9. Open Questions

1. **File size limit:** Is 20 MB the right ceiling for government correspondence PDFs, or should it be higher (e.g., 50 MB)?
2. **Document number at upload time:** The document number is a metadata field filled during review (WO-009). Should the table show "—" (dash) for document number until review is complete, or auto-generate a temporary placeholder?
3. **Retry behavior:** When a document has `Error` status, should the user re-upload the file or should the system retry automatically using the locally buffered file?
4. **R2 bucket visibility:** Should the R2 bucket be private (all access via presigned URLs) or public with path-based access control? Private is recommended for security.
5. **documents table creation:** Will the `documents` table be created as part of WO-004, or does it already exist from Phase 1 (WO-002)?
