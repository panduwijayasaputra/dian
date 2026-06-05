# Task List: Phase 2 — Document Management

**PRD:** `docs/prd/prd-phase-2-document-management.md`
**Work Orders:** WO-004, WO-005, WO-006
**Status:** In Progress

---

## Relevant Files

- `prisma/schema.prisma` — Add `Document` model and `DocumentStatus` enum.
- `prisma/migrations/` — Auto-generated migration for the documents table.
- `src/lib/r2.ts` — Cloudflare R2 client, upload utility, and presigned URL utility.
- `src/lib/prisma.ts` — Existing Prisma client singleton (used across tasks).
- `.env.example` — Document new R2 environment variables.
- `src/app/(app)/upload/page.tsx` — Upload page route.
- `src/components/upload/drop-zone.tsx` — Drag-and-drop / file picker component.
- `src/components/upload/upload-queue.tsx` — Queue list showing pending files.
- `src/app/(app)/upload/actions.ts` — Server Action: upload file to R2 and create DB record.
- `src/app/(app)/documents/page.tsx` — Documents list page route.
- `src/components/documents/documents-table.tsx` — Table component showing all documents.
- `src/components/documents/status-badge.tsx` — Color-coded status badge component.
- `src/components/documents/document-viewer-modal.tsx` — Modal with PDF iframe viewer.
- `src/app/(app)/documents/actions.ts` — Server Action: generate presigned URL for viewer.
- `src/app/(app)/layout.tsx` — Add navigation link to Documents and Upload.

### Notes

- Use `pnpm test` to run the full test suite before committing each parent task.
- Package manager is `pnpm` — do not use `npm` or `yarn`.
- All R2 operations (upload, presigned URL generation) must happen in Server Actions or API Routes — never in the browser.
- Prisma client is a singleton at `src/lib/prisma.ts`. Import from there.
- shadcn/ui components live in `src/components/ui/`. Add new ones with `pnpm dlx shadcn@latest add <component>`.

---

## Tasks

- [x] 1.0 Database — Create `documents` table and migration
  - [x] 1.1 Add `DocumentStatus` enum to `prisma/schema.prisma`
    - Open `prisma/schema.prisma`.
    - Add the following enum above the `User` model:
      ```prisma
      enum DocumentStatus {
        LOCAL
        UPLOADING
        PROCESSING
        READY
        ERROR
      }
      ```
  - [x] 1.2 Add `Document` model to `prisma/schema.prisma`
    - Add the following model below the `User` model:
      ```prisma
      model Document {
        id             String         @id @default(cuid())
        userId         String
        user           User           @relation(fields: [userId], references: [id])
        r2Key          String?
        status         DocumentStatus @default(UPLOADING)
        documentNumber String?
        documentDate   DateTime?
        sender         String?
        subject        String?
        fileSizeBytes  Int?
        originalName   String?
        createdAt      DateTime       @default(now())
        updatedAt      DateTime       @updatedAt
      }
      ```
    - Also add `documents Document[]` to the `User` model so the relation is defined on both sides.
  - [x] 1.3 Run migration and verify
    - Run `pnpm prisma migrate dev --name add-documents-table` to generate the migration and apply it.
    - Run `pnpm prisma generate` to regenerate the Prisma client.
    - Confirm the `documents` table exists in the database by running `pnpm prisma studio` or inspecting the migration file in `prisma/migrations/`.

- [x] 2.0 R2 Integration — Configure Cloudflare R2 SDK and server-side utilities
  - [x] 2.1 Install R2 SDK packages
    - Run `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`.
    - Verify both packages appear in `package.json` under `dependencies`.
  - [x] 2.2 Add R2 environment variables
    - Add the following to `.env.local` (with real values):
      ```
      R2_ACCOUNT_ID=
      R2_ACCESS_KEY_ID=
      R2_SECRET_ACCESS_KEY=
      R2_BUCKET_NAME=
      R2_PUBLIC_URL=
      ```
    - Add the same keys (with empty values) to `.env.example` so other developers know what is required.
  - [x] 2.3 Create R2 client singleton at `src/lib/r2.ts`
    - Create `src/lib/r2.ts`.
    - Instantiate an `S3Client` using the R2-compatible endpoint:
      ```ts
      const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      ```
    - Export the client as a singleton (same pattern as `src/lib/prisma.ts`).
    - Mark the file or the import with `'server-only'` to prevent accidental client-side use. Install `server-only` if not present: `pnpm add server-only`.
  - [x] 2.4 Add `uploadToR2` utility function in `src/lib/r2.ts`
    - Accepts: `key: string`, `body: Buffer | Uint8Array`, `contentType: string`.
    - Uses `PutObjectCommand` from `@aws-sdk/client-s3`.
    - Returns the `key` on success.
    - Throws an error on failure so the caller can handle it.
  - [x] 2.5 Add `getPresignedUrl` utility function in `src/lib/r2.ts`
    - Accepts: `key: string`, `expiresInSeconds?: number` (default 3600).
    - Uses `getSignedUrl` from `@aws-sdk/s3-request-presigner` with a `GetObjectCommand`.
    - Returns the signed URL string.
    - This function must only be called from Server Actions or API Routes.

- [ ] 3.0 Document Upload — Build upload UI with drag-and-drop, file picker, validation, and queue
  - [ ] 3.1 Create the upload page route at `src/app/(app)/upload/page.tsx`
    - Create the directory `src/app/(app)/upload/`.
    - Create `page.tsx` as a Server Component.
    - Add a page heading (e.g., "Upload Document") and render the `DropZone` component (to be created in 3.2).
    - The page is protected by the existing `(app)` layout middleware from Phase 1.
  - [ ] 3.2 Create `DropZone` component at `src/components/upload/drop-zone.tsx`
    - This is a Client Component (`'use client'`).
    - Render a dashed-border drop zone area with an upload icon and the label "Drag a PDF here".
    - Below the drop zone, render a "Browse files" button that triggers a hidden `<input type="file" accept=".pdf" />`.
    - Handle `onDragOver`, `onDragLeave`, and `onDrop` events:
      - On drag-over: apply an active highlight style to the drop zone.
      - On drag-leave: remove the highlight.
      - On drop: extract the file from `event.dataTransfer.files[0]` and pass it to the validation step (3.3).
    - Handle file picker `onChange`: extract `event.target.files[0]` and pass it to the validation step.
    - Only accept one file at a time from both paths.
  - [ ] 3.3 Add client-side PDF validation inside `DropZone`
    - After a file is selected (from drop or picker), check:
      1. `file.type === 'application/pdf'` — if not, show an inline error: "Only PDF files are accepted."
      2. `file.size <= 20 * 1024 * 1024` (20 MB) — if not, show: "File exceeds the 20 MB limit."
    - If both checks pass, add the file to the upload queue state (3.5).
    - Show the error message below the drop zone. Clear the error when a new file is selected.
  - [ ] 3.4 Create Server Action at `src/app/(app)/upload/actions.ts`
    - Create `uploadDocument(formData: FormData)` as a `'use server'` action.
    - Steps inside the action:
      1. Extract the file from `formData.get('file')`.
      2. Validate file type (`application/pdf`) and size (≤ 20 MB) on the server as a second check.
      3. Generate a unique R2 key: `documents/${userId}/${crypto.randomUUID()}.pdf`.
      4. Call `uploadToR2(key, buffer, 'application/pdf')` from `src/lib/r2.ts`.
      5. Create a `Document` record in PostgreSQL via Prisma with:
         - `userId` from the current session (use `auth()` from `src/auth.ts`)
         - `r2Key` set to the key from step 3
         - `status` set to `PROCESSING` (upload is complete; pipeline is next)
         - `originalName` set to the original filename
         - `fileSizeBytes` set to the file size
      6. Return `{ success: true, documentId }` or `{ success: false, error: string }`.
  - [ ] 3.5 Add upload queue state inside `DropZone`
    - Maintain a `queue: File[]` state array in the `DropZone` component.
    - When a valid file is selected, append it to `queue`.
    - Process the queue one file at a time:
      - Take the first file in `queue`, call the Server Action, then shift it off the queue.
      - Show a "Next up" section below the drop zone listing queued files, each with a remove (×) button.
    - Only start uploading the next file after the current one completes (success or error).
  - [ ] 3.6 Show upload progress indicator
    - While a file is uploading, show a spinner or progress bar inside the drop zone area.
    - Disable the file picker and drop zone while an upload is in progress (prevent adding a duplicate).
    - On success: briefly show a "Uploaded successfully" message, then either redirect to `/documents` or begin the next queued upload.
    - On error: show the error message returned by the Server Action with a "Retry" button that re-submits the same file.

- [ ] 4.0 Documents List Page — Build `/documents` page with table, status badges, and empty state
  - [ ] 4.1 Create the documents page route at `src/app/(app)/documents/page.tsx`
    - Create the directory `src/app/(app)/documents/`.
    - Create `page.tsx` as a Server Component.
    - Fetch all documents for the current user from the database using Prisma, ordered by `createdAt` descending.
    - Pass the documents array as a prop to `DocumentsTable` (4.2).
  - [ ] 4.2 Create `DocumentsTable` component at `src/components/documents/documents-table.tsx`
    - Accepts `documents: Document[]` as a prop.
    - Render a `<table>` (or shadcn/ui `Table` component) with these columns:
      - **Document Number** — show `document.documentNumber ?? "—"` (dash if not yet filled)
      - **Subject** — show `document.subject ?? "—"`
      - **Sender** — show `document.sender ?? "—"`
      - **Document Date** — show formatted date or "—"
      - **Status** — render `<StatusBadge status={document.status} />`
      - **Actions** — render a "View" button (wired in task 5.0)
    - If `documents.length === 0`, render the empty state (4.4) instead of the table.
  - [ ] 4.3 Create `StatusBadge` component at `src/components/documents/status-badge.tsx`
    - Accepts `status: DocumentStatus` as a prop.
    - Render a `<span>` or shadcn/ui `Badge` with label and color based on status:
      - `LOCAL` → gray → "Saved Locally"
      - `UPLOADING` → blue → "Uploading"
      - `PROCESSING` → amber → "Processing"
      - `READY` → green → "Ready"
      - `ERROR` → red → "Error"
  - [ ] 4.4 Add empty state to `DocumentsTable`
    - When `documents.length === 0`, render a centered empty state with:
      - An icon (e.g., a document or inbox icon from lucide-react).
      - Text: "No documents yet."
      - A link/button: "Upload your first document" that navigates to `/upload`.
  - [ ] 4.5 Add navigation links to the app shell
    - Open `src/app/(app)/layout.tsx`.
    - Add navigation links for "Documents" (`/documents`) and "Upload" (`/upload`) to the existing app shell/sidebar/nav bar.

- [ ] 5.0 Document Viewer Modal — Build View button, PDF modal, and presigned URL fetching
  - [ ] 5.1 Create Server Action at `src/app/(app)/documents/actions.ts`
    - Create `getDocumentViewUrl(documentId: string)` as a `'use server'` action.
    - Steps:
      1. Fetch the `Document` record from the database by `id`.
      2. Verify the document belongs to the current user (auth check).
      3. If `r2Key` is null or status is `LOCAL`, return `{ success: false, error: 'Document not available' }`.
      4. Call `getPresignedUrl(document.r2Key)` from `src/lib/r2.ts`.
      5. Return `{ success: true, url }`.
  - [ ] 5.2 Create `DocumentViewerModal` component at `src/components/documents/document-viewer-modal.tsx`
    - This is a Client Component (`'use client'`).
    - Accept props: `documentId: string`, `isOpen: boolean`, `onClose: () => void`.
    - When `isOpen` is true and `documentId` is set:
      - Call the `getDocumentViewUrl` Server Action to fetch the presigned URL.
      - Show a loading spinner while fetching.
      - Render the URL inside an `<iframe src={url} />` that fills the modal body.
      - Show an error message if the action returns `{ success: false }`.
    - Use a shadcn/ui `Dialog` component for the modal shell. Add it with `pnpm dlx shadcn@latest add dialog`.
    - The modal should be large enough to comfortably read a PDF (e.g., `max-w-5xl`, full viewport height with scroll).
    - Include a visible close button (shadcn/ui `DialogClose`) in the top-right corner.
  - [ ] 5.3 Wire the View button in `DocumentsTable` to open the modal
    - Convert `DocumentsTable` to a Client Component or extract the View button as a small Client Component.
    - Maintain state: `selectedDocumentId: string | null` and `isModalOpen: boolean`.
    - Clicking "View" sets `selectedDocumentId` to the row's document ID and sets `isModalOpen = true`.
    - Render `<DocumentViewerModal>` once at the bottom of the table component, passing `selectedDocumentId` and `isModalOpen`.
    - Closing the modal sets `isModalOpen = false` and clears `selectedDocumentId`.
  - [ ] 5.4 Disable View button for documents without an R2 file
    - In the table row, disable the "View" button when `document.status === 'LOCAL'` or `document.r2Key === null`.
    - Apply a visually distinct disabled style (e.g., `opacity-50 cursor-not-allowed`) so users understand the document is not yet viewable.
