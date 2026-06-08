# Tasks: Phase 3 — Metadata

Based on: [prd-phase-3-metadata.md](../prd/prd-phase-3-metadata.md)

---

## Relevant Files

- `prisma/schema.prisma` — Add `EXTRACTING` and `REVIEW` to `DocumentStatus`; add `extractedText` and `extractionResult` columns to `Document`.
- `src/lib/pdf.ts` — Server-side utility to download a PDF from R2 and extract raw text using `pdf-parse`.
- `src/lib/extract-metadata.ts` — Server-side utility to call OpenAI with structured output and return per-field values + confidence.
- `src/app/(app)/upload/actions.ts` — Existing upload Server Action; extended to trigger extraction after upload.
- `src/app/(app)/documents/actions.ts` — Existing documents Server Actions; extended with `extractDocumentMetadata`, `saveDocumentMetadata`, `deleteDocument`, and `updateDocumentMetadata`.
- `src/components/documents/metadata-form.tsx` — Shared form component used by both the review sheet and the settings page.
- `src/components/documents/metadata-review-sheet.tsx` — Right-side Sheet drawer that opens after every upload; handles extraction loading state, AI-suggested badges, and save/cancel actions.
- `src/app/(app)/upload/upload-flow.tsx` — Client component that owns the post-upload state (documentId, sheet open/closed) and renders `DropZone` + `MetadataReviewSheet` together.
- `src/app/(app)/upload/page.tsx` — Updated to render `<UploadFlow />` instead of `<DropZone />` directly.
- `src/app/(app)/documents/[id]/settings/page.tsx` — Metadata editing page at `/documents/[id]/settings`.
- `src/components/documents/documents-table.tsx` — Updated to add a "Settings" action button per row and support new statuses.
- `src/components/documents/status-badge.tsx` — Updated to handle `EXTRACTING` and `REVIEW` statuses.
- `src/components/ui/sheet.tsx` — shadcn Sheet component (to be added).
- `src/components/ui/select.tsx` — shadcn Select component (to be added).

### Notes

- Package manager is **pnpm**. Use `pnpm add <pkg>` to install dependencies.
- Use `pnpm dlx shadcn@latest add <component>` to add shadcn components.
- No test suite is configured yet; skip `pnpm test` and commit directly after each parent task.
- Commit format: `git commit -m "feat: summary" -m "- detail" -m "Related to WO-00X"`

---

## Tasks

- [x] 1.0 Extend Database Schema and Migrate (WO-007)
  - [x] 1.1 Add `EXTRACTING` and `REVIEW` to the `DocumentStatus` enum in `prisma/schema.prisma`
    - Open `prisma/schema.prisma`.
    - Add `EXTRACTING` between `PROCESSING` and `READY` in the `DocumentStatus` enum.
    - Add `REVIEW` after `EXTRACTING`.
    - Final order: `LOCAL`, `UPLOADING`, `PROCESSING`, `EXTRACTING`, `REVIEW`, `READY`, `ERROR`.
  - [x] 1.2 Add `extractedText` and `extractionResult` columns to the `Document` model
    - In the `Document` model in `prisma/schema.prisma`, add:
      - `extractedText  String?` — stores raw PDF text for offline full-text search (D-011).
      - `extractionResult Json?` — stores the OpenAI extraction response (field values + confidence scores) as JSONB.
  - [x] 1.3 Run migration and regenerate Prisma client
    - Run `pnpm db:migrate:dev` and name the migration `add_extraction_fields`.
    - Run `pnpm db:generate` to regenerate the Prisma client.
    - Verify the generated `DocumentStatus` enum in `src/generated/prisma/enums.ts` includes `EXTRACTING` and `REVIEW`.

- [x] 2.0 Build PDF Text Extraction and OpenAI Metadata Extraction Pipeline (WO-008)
  - [x] 2.1 Install required packages
    - Run `pnpm add openai pdf-parse zod react-hook-form @hookform/resolvers`.
    - Run `pnpm add -D @types/pdf-parse`.
  - [x] 2.2 Create `src/lib/pdf.ts` — PDF download and text extraction utility
    - Import the S3 `GetObjectCommand` from `@aws-sdk/client-s3` and the existing `r2Client` from `src/lib/r2.ts`.
    - Export an async function `extractTextFromR2(r2Key: string): Promise<string>` that:
      1. Calls `r2Client.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: r2Key }))`.
      2. Converts the response body stream to a `Buffer`.
      3. Passes the buffer to `pdf-parse` and returns the extracted `.text` string.
      4. Returns an empty string if extraction throws (do not rethrow).
    - Mark the file with `import 'server-only'` at the top so it is never bundled client-side.
  - [x] 2.3 Create `src/lib/extract-metadata.ts` — OpenAI structured extraction utility
    - Import `OpenAI` and `z` from `openai` and `zod`.
    - Define a `ConfidenceLevel` type: `'high' | 'medium' | 'low'`.
    - Define a `ExtractionField` type: `{ value: string | null; confidence: ConfidenceLevel }`.
    - Define a `ExtractionResult` type with five keys: `documentNumber`, `documentDate`, `sender`, `subject`, `documentType` — each typed as `ExtractionField`.
    - Export an async function `extractMetadataFromText(text: string): Promise<ExtractionResult>` that:
      1. Instantiates `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`.
      2. Calls `client.responses.parse(...)` (or `chat.completions.create`) using `gpt-4o-mini` with a JSON schema that requires all five fields, each with a `value` (string or null) and a `confidence` ('high'|'medium'|'low').
      3. The system prompt must explain it is extracting metadata from Indonesian government correspondence.
      4. The user message must include the first 3000 characters of the extracted PDF text.
      5. Returns the parsed result, or a fallback `ExtractionResult` with all fields `{ value: null, confidence: 'low' }` if the API call throws.
    - Mark with `import 'server-only'`.
  - [x] 2.4 Create `extractDocumentMetadata` Server Action in `src/app/(app)/documents/actions.ts`
    - Add an `extractDocumentMetadata(documentId: string)` Server Action that:
      1. Validates the session; returns an error if unauthenticated.
      2. Fetches the document from the DB; returns an error if not found or not owned by the user.
      3. Returns an error if the document has no `r2Key`.
      4. Updates document status to `EXTRACTING` in the DB.
      5. Calls `extractTextFromR2(document.r2Key)` from `src/lib/pdf.ts`.
      6. Calls `extractMetadataFromText(text)` from `src/lib/extract-metadata.ts`.
      7. Saves `extractedText` and `extractionResult` (as JSON) to the document row in the DB.
      8. Updates document status to `REVIEW`.
      9. Returns `{ success: true, result: ExtractionResult }` or `{ success: false, error: string }`.

- [x] 3.0 Build MetadataForm Component and Metadata Review Sheet (WO-009)
  - [x] 3.1 Install shadcn Sheet and Select components
    - Run `pnpm dlx shadcn@latest add sheet`.
    - Run `pnpm dlx shadcn@latest add select`.
    - Confirm `src/components/ui/sheet.tsx` and `src/components/ui/select.tsx` were created.
  - [x] 3.2 Create `src/components/documents/metadata-form.tsx` — shared form component
    - Define a `MetadataFormValues` interface (also export it) with:
      - `documentNumber: string`
      - `documentDate: string` (ISO date string `YYYY-MM-DD`, from an `<input type="date">`)
      - `sender: string`
      - `subject: string`
      - `documentType: string` (one of the `DocumentType` enum string values, or empty string)
    - Define a `zod` schema (`metadataSchema`) that validates `documentNumber` and `subject` as required non-empty strings; all other fields as optional strings.
    - Accept props:
      - `defaultValues?: Partial<MetadataFormValues>` — pre-fills the form.
      - `aiSuggestions?: Record<keyof MetadataFormValues, { confidence: 'high'|'medium'|'low' }>` — when provided, shows an "AI" badge next to each matching field label.
      - `onSubmit: (values: MetadataFormValues) => void | Promise<void>` — called on valid submit.
      - `isSubmitting?: boolean` — disables the Save button when true.
      - `submitLabel?: string` — button label, defaults to "Simpan".
    - Wire up `react-hook-form` with `zodResolver(metadataSchema)`.
    - Render five fields stacked vertically using shadcn `Input`, `Select`, and `<input type="date">`:
      1. `documentNumber` → text Input.
      2. `documentDate` → `<input type="date" className="...">` styled to match shadcn Input.
      3. `sender` → text Input.
      4. `subject` → text Input.
      5. `documentType` → shadcn Select with options: `INCOMING_LETTER` → "Surat Masuk", `OUTGOING_LETTER` → "Surat Keluar", `DISPOSITION` → "Disposisi", `MEMO` → "Memo", `REPORT` → "Laporan", `DECREE` → "Surat Keputusan", `OTHER` → "Lainnya".
    - For each field that has an `aiSuggestions` entry, render a small badge next to the label:
      - `high` → green `<Badge>` with text "AI · Tinggi"
      - `medium` → amber `<Badge>` with text "AI · Sedang"
      - `low` → red `<Badge>` with text "AI · Rendah"
    - Render a Submit button at the bottom using the `submitLabel` prop, disabled when `isSubmitting` is true.
    - Render a form-level error message below the button if `documentNumber` or `subject` is empty on submit.
  - [x] 3.3 Add `saveDocumentMetadata` and `deleteDocument` Server Actions in `src/app/(app)/documents/actions.ts`
    - `saveDocumentMetadata(documentId: string, values: MetadataFormValues)`:
      1. Validate session and document ownership.
      2. Parse `documentDate` string to a `Date` object (or null if empty).
      3. Update the document row: set all five metadata fields + `status: 'READY'`.
      4. Return `{ success: true }` or `{ success: false, error: string }`.
    - `deleteDocument(documentId: string)`:
      1. Validate session and document ownership.
      2. Fetch the document's `r2Key` from the DB.
      3. If `r2Key` exists, delete the object from R2 using `DeleteObjectCommand`.
      4. Delete the document row from the DB.
      5. Return `{ success: true }` or `{ success: false, error: string }`.
  - [x] 3.4 Create `src/components/documents/metadata-review-sheet.tsx`
    - This is a `'use client'` component.
    - Accept props: `open: boolean`, `documentId: string | null`, `onClose: () => void`.
    - On mount (when `open` becomes true and `documentId` is set), call `extractDocumentMetadata(documentId)` and track loading state (`isExtracting`).
    - While `isExtracting` is true, render the Sheet with a skeleton / spinner inside the content area instead of the form.
    - Once extraction resolves (success or failure):
      - Map the `ExtractionResult` to `defaultValues` for `MetadataForm` (convert `value` fields to strings).
      - Map the `ExtractionResult` to `aiSuggestions` for `MetadataForm` (only include fields where `value` is non-null).
      - Render `<MetadataForm>` with these props.
    - The Sheet header should read "Tinjau Metadata Dokumen".
    - The Sheet must include a "Batal" button (separate from the form's Save button). Clicking "Batal":
      1. Show a native `confirm()` dialog: "Batalkan unggahan? Dokumen akan dihapus."
      2. If confirmed: call `deleteDocument(documentId)`, then call `onClose()`.
      3. If cancelled: do nothing.
    - On `MetadataForm` submit: call `saveDocumentMetadata(documentId, values)`. On success, call `onClose()`.
    - If `saveDocumentMetadata` returns an error, display it below the form.
  - [x] 3.5 Create `src/app/(app)/upload/upload-flow.tsx` and update `upload/page.tsx`
    - Create `upload-flow.tsx` as a `'use client'` component that:
      - Holds state: `documentId: string | null` (null = sheet closed).
      - Renders `<DropZone onUploadComplete={(id) => setDocumentId(id)} />`.
      - Renders `<MetadataReviewSheet open={!!documentId} documentId={documentId} onClose={() => { setDocumentId(null); router.push('/documents') }} />`.
    - Modify `DropZone` to accept an optional `onUploadComplete?: (documentId: string) => void` prop.
      - When `result.success` is true, call `onUploadComplete(result.documentId)` instead of `router.push('/documents')`.
      - Keep the existing redirect behavior when `onUploadComplete` is not provided (backward-compatible).
    - Update `src/app/(app)/upload/page.tsx` to render `<UploadFlow />` instead of `<DropZone />`.

- [x] 4.0 Build Metadata Settings Page (WO-010)
  - [x] 4.1 Add `updateDocumentMetadata` Server Action in `src/app/(app)/documents/actions.ts`
    - `updateDocumentMetadata(documentId: string, values: MetadataFormValues)`:
      1. Validate session and document ownership.
      2. Parse `documentDate` string to a `Date` object (or null if empty).
      3. Update the document row with the five metadata fields. Do not change `status`.
      4. Return `{ success: true }` or `{ success: false, error: string }`.
  - [x] 4.2 Create `src/app/(app)/documents/[id]/settings/page.tsx`
    - This is a server component.
    - Receive `params: { id: string }` from the route.
    - Validate the session; redirect to `/login` if unauthenticated.
    - Fetch the document by `id` from the DB. If not found or not owned by the user, redirect to `/documents`.
    - Map the document's current metadata fields to `defaultValues` for `MetadataForm`.
    - Render an `<h1>` with text "Edit Metadata" and the document's `originalName` as a subtitle.
    - Render a `<SettingsForm>` client component (see 4.3) that wraps `MetadataForm` with the server-fetched defaults.
  - [x] 4.3 Create `src/app/(app)/documents/[id]/settings/settings-form.tsx`
    - This is a `'use client'` component.
    - Accept `defaultValues: MetadataFormValues` and `documentId: string` as props.
    - On `MetadataForm` submit, call `updateDocumentMetadata(documentId, values)`.
    - On success, display a success toast or inline success message ("Metadata berhasil disimpan."). Stay on the settings page.
    - On error, display the error message below the form.
    - Use shadcn `sonner` toast if available, otherwise a simple inline `<p className="text-green-600">` message.
  - [x] 4.4 Add a "Edit" action to `src/components/documents/documents-table.tsx`
    - Import `Link` from `next/link`.
    - In the actions cell (last column) of each document row, add a `<Link href={'/documents/${doc.id}/settings'}>` wrapped in a small secondary `<Button variant="ghost" size="sm">` with text "Edit".
    - Place the "Edit" button next to the existing "Lihat" button.

- [x] 5.0 Update Status Badge and Documents Table for New Statuses
  - [x] 5.1 Add `EXTRACTING` and `REVIEW` entries to `src/components/documents/status-badge.tsx`
    - Add to `STATUS_CONFIG`:
      - `EXTRACTING`: label "Mengekstrak", className `bg-purple-100 text-purple-700 hover:bg-purple-100`.
      - `REVIEW`: label "Perlu Ditinjau", className `bg-blue-100 text-blue-700 hover:bg-blue-100`.
  - [x] 5.2 Update "Lihat" button disabled condition in `src/components/documents/documents-table.tsx`
    - The "Lihat" button is currently disabled when `!doc.r2Key || doc.status === 'LOCAL'`.
    - Extend the condition to also disable when `doc.status === 'EXTRACTING' || doc.status === 'REVIEW'`, since metadata has not been confirmed yet.
