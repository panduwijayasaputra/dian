# Tasks: Phase 6 — Offline First

Based on [prd-phase-6-offline-first.md](../prd/prd-phase-6-offline-first.md)

## Relevant Files

### New Files
- `public/manifest.json` — Web App Manifest with app name, icons, display mode, theme colors.
- `public/icons/icon-192.png` — PWA app icon at 192×192 (must be created manually or generated).
- `public/icons/icon-512.png` — PWA app icon at 512×512 (must be created manually or generated).
- `public/sw.js` — Hand-written service worker: app shell caching, cache-first for static assets, network-first for navigation, passthrough for API routes.
- `src/app/offline/page.tsx` — Fallback page shown when navigation fails while offline.
- `src/components/pwa/install-prompt.tsx` — Client component that handles `beforeinstallprompt` and renders the "Install App" button in the nav header.
- `src/components/pwa/sync-button.tsx` — Client component that shows sync state (spinner, pending count badge, last-synced time) and triggers `syncAll()`.
- `src/lib/idb.ts` — IndexedDB helper module: opens `dian-db`, defines the `LocalDocument` type, and exports typed CRUD and query functions.
- `src/lib/sync.ts` — Sync engine: `syncAll()` orchestrates upload of pending documents and download of all server documents.

### Modified Files
- `src/app/layout.tsx` — Add `<link rel="manifest">`, update metadata (title/description), register the service worker via a `<Script>` tag.
- `src/app/(app)/layout.tsx` — Add `<InstallPrompt>` and `<SyncButton>` to the nav header (right of nav links, left of `<LogoutButton>`).
- `src/components/upload/drop-zone.tsx` — Detect `!navigator.onLine` before calling `uploadDocument`; if offline, store the file blob in IndexedDB and show a queued confirmation.
- `src/components/search/search-view.tsx` — Branch `runSearch` on `isOnline`: when offline, call `queryDocuments` from `lib/idb.ts`. Update offline banner text.
- `src/components/documents/document-viewer-modal.tsx` — Check IndexedDB for a local `file_blob` when offline; show "Document not available offline" if neither blob nor cached URL is present.
- `src/app/(app)/documents/actions.ts` — Add `getDocumentsForSync()` server action that returns all user documents formatted for IndexedDB upsert.

### Notes
- Run `pnpm test` before committing each parent task. There are currently no unit tests required for this phase's new modules, but existing tests must continue to pass.
- Service worker changes only take effect after a hard reload or SW update cycle in the browser — test in an incognito window with DevTools > Application > Service Workers.
- The PNG icon files in `public/icons/` must exist before testing the PWA installability — use any 192×192 and 512×512 PNG placeholder if final artwork is not ready.

---

## Tasks

- [ ] 1.0 PWA Manifest & Install Prompt
  - [x] 1.1 Create icon assets
    - Create the directory `public/icons/`.
    - Add two PNG icon files: `icon-192.png` (192×192 px) and `icon-512.png` (512×512 px). For MVP, a simple solid-colour PNG with "D" text is fine. These files must exist for the PWA installability audit to pass.
    - If no design tool is available, create minimal PNGs programmatically using a Node script or use any placeholder PNG renamed to the correct filenames.

  - [x] 1.2 Create `public/manifest.json`
    - Create the file with these fields:
      ```json
      {
        "name": "DIAN",
        "short_name": "DIAN",
        "description": "Document Intelligence and Archive Network",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#000000",
        "icons": [
          { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
          { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
        ]
      }
      ```
    - Adjust `theme_color` and `background_color` to match the app's Tailwind theme if known.

  - [x] 1.3 Link manifest and update root layout metadata
    - Open `src/app/layout.tsx`.
    - Update the exported `metadata` object: set `title` to `"DIAN"` and `description` to `"Document Intelligence and Archive Network"`.
    - Add a `<link rel="manifest" href="/manifest.json" />` inside the `<head>` via Next.js `Metadata` API (use the `manifest` key in the metadata export, or add it via `<head>` in the JSX). Prefer the `metadata.manifest` field: `manifest: '/manifest.json'`.
    - Also add `<meta name="theme-color" content="#000000" />` via `themeColor` in the metadata export.

  - [x] 1.4 Create `src/app/offline/page.tsx`
    - This is a simple server component (no `'use client'` needed).
    - Display a heading ("Anda sedang offline"), a short message ("Halaman ini tidak tersedia saat offline. Kembali ke halaman sebelumnya."), and a link back to `/documents`.
    - Use existing shadcn/ui `Button` and standard Tailwind layout classes.

  - [x] 1.5 Create `src/components/pwa/install-prompt.tsx`
    - Mark as `'use client'`.
    - On mount, listen for the `beforeinstallprompt` window event. When it fires, save the event in a ref and set `canInstall` state to `true`.
    - Also listen for the `appinstalled` event; when it fires, set `canInstall` to `false`.
    - Render nothing when `canInstall` is `false`.
    - When `canInstall` is `true`, render a small `Button` (variant `ghost`, size `sm`) with a `Download` icon from `lucide-react` and the label "Install App". Clicking it calls `event.prompt()` on the saved event ref.
    - Use `typeof window === 'undefined'` guard to prevent SSR crashes.

  - [x] 1.6 Add `InstallPrompt` to the app nav header
    - Open `src/app/(app)/layout.tsx`.
    - Import `InstallPrompt` from `@/components/pwa/install-prompt`.
    - Place `<InstallPrompt />` in the right side of the nav `<div>`, between the nav links block and `<LogoutButton />`.

- [ ] 2.0 Service Worker & App Shell Caching
  - [ ] 2.1 Create `public/sw.js`
    - Define a cache name constant: `const CACHE_NAME = 'dian-v1'`.
    - Define an array of assets to pre-cache on install: `['/offline', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']`.
    - **`install` event handler:**
      - Call `event.waitUntil(...)`.
      - Open the cache, add all pre-cache assets.
      - Call `self.skipWaiting()` so the new SW activates immediately without waiting for old tabs to close.
    - **`activate` event handler:**
      - Call `event.waitUntil(clients.claim())` so the SW takes control of all open pages immediately.
      - Delete any old caches whose name does not match `CACHE_NAME`.
    - **`fetch` event handler:**
      - If the request method is not `GET`, do not intercept (return `event.respondWith(fetch(event.request))` — this covers POST requests used by Next.js server actions).
      - If the request URL pathname starts with `/api/`, do not intercept (pass through to network).
      - If the request URL pathname starts with `/_next/static/`, use **cache-first**: check the cache, return if found; otherwise fetch from network, clone the response, store it in the cache, and return it.
      - For all other GET requests (navigation and other static files in `/public`), use **network-first**: try `fetch(event.request)`, cache the successful response, return it. On network failure, check the cache. If the cache also misses and the request is a navigation (`request.mode === 'navigate'`), return the cached `/offline` page. Otherwise, let the error propagate.

  - [ ] 2.2 Register the service worker in the root layout
    - Open `src/app/layout.tsx`.
    - Import `Script` from `next/script`.
    - Add a `<Script>` tag with `strategy="afterInteractive"` containing inline JS:
      ```js
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
      }
      ```
    - Place the `<Script>` tag inside the `<body>` element, after `{children}`.
    - This registers the service worker on every page load; the browser deduplicates re-registration automatically.

- [ ] 3.0 IndexedDB Storage Layer
  - [ ] 3.1 Install the `idb` package
    - Run `pnpm add idb`.
    - Verify it appears in `package.json` under `dependencies`.

  - [ ] 3.2 Create `src/lib/idb.ts` — types and database open
    - Export a TypeScript interface `LocalDocument` with all fields from FR-011:
      ```ts
      export interface LocalDocument {
        id: string
        document_number: string | null
        document_date: string | null   // ISO date string
        sender: string | null
        subject: string | null
        summary: string | null
        extracted_text: string | null
        status: 'pending_sync' | 'synced' | 'processing' | 'ready' | 'failed'
        r2_key: string | null
        file_blob: Blob | null
        original_name: string | null
        created_at: string            // ISO datetime
        synced_at: string | null      // ISO datetime
      }
      ```
    - Export an `openDB()` function that opens `dian-db` at version 1.
    - In the `upgrade` callback, create the `documents` object store with `keyPath: 'id'`, then create three indexes:
      - `by_status` on `status` (non-unique)
      - `by_sender` on `sender` (non-unique)
      - `by_date` on `document_date` (non-unique)
    - Cache the DB promise in a module-level variable so `openDB()` is only called once per page load.
    - Use a `typeof window === 'undefined'` guard; return `null` on the server so this module is safe to import in files that may run in SSR context.

  - [ ] 3.3 Add `upsertDocument` and `getDocument` helpers
    - `upsertDocument(doc: LocalDocument): Promise<void>` — opens the DB and calls `db.put('documents', doc)`. This creates the record if it doesn't exist and updates it if it does (because `put` uses the keyPath `id`).
    - `getDocument(id: string): Promise<LocalDocument | undefined>` — opens the DB and calls `db.get('documents', id)`.

  - [ ] 3.4 Add `listDocuments` and `deleteDocument` helpers
    - `listDocuments(): Promise<LocalDocument[]>` — opens the DB and calls `db.getAll('documents')`. Returns an empty array if the DB is null (server context).
    - `deleteDocument(id: string): Promise<void>` — opens the DB and calls `db.delete('documents', id)`.

  - [ ] 3.5 Add `queryDocuments` for offline search
    - `queryDocuments(query: string, filters: SearchFilters): Promise<LocalDocument[]>` — performs an in-memory search over IndexedDB records.
    - Implementation steps:
      1. Call `listDocuments()` to get all records.
      2. If `filters.documentNumber` is set, keep only records where `document_number` includes it (case-insensitive).
      3. If `filters.sender` is set, keep only records where `sender` includes it (case-insensitive).
      4. If `filters.subject` is set, keep only records where `subject` includes it (case-insensitive).
      5. If `filters.dateFrom` is set, keep only records where `document_date >= dateFrom`.
      6. If `filters.dateTo` is set, keep only records where `document_date <= dateTo`.
      7. If `query` is a non-empty string, further filter to records where any of these fields contain the query (case-insensitive): `document_number`, `sender`, `subject`, `summary`, `extracted_text`.
      8. Sort results by `document_date` descending (nulls last).
      9. Return the filtered, sorted array.
    - Import `SearchFilters` type from `@/app/(app)/search/actions` to keep types consistent.

- [ ] 4.0 Offline Upload & Offline Search Integration
  - [ ] 4.1 Add offline upload path to `drop-zone.tsx`
    - Open `src/components/upload/drop-zone.tsx`.
    - In the `useEffect` that processes the upload queue, before calling `uploadDocument(formData)`, check `navigator.onLine`.
    - **If offline:**
      1. Import `crypto.randomUUID` (available in modern browsers) to generate a temporary local `id`.
      2. Import `upsertDocument` from `@/lib/idb`.
      3. Store the file as a `LocalDocument` in IndexedDB:
         ```ts
         await upsertDocument({
           id: crypto.randomUUID(),
           document_number: null,
           document_date: null,
           sender: null,
           subject: null,
           summary: null,
           extracted_text: null,
           status: 'pending_sync',
           r2_key: null,
           file_blob: file,
           original_name: file.name,
           created_at: new Date().toISOString(),
           synced_at: null,
         })
         ```
      4. Set `uploadStatus` to `'success'` and `currentFileName` to the file name (so the success state renders).
      5. Remove the file from the queue and set `isUploading` to `false`.
      6. After 800 ms, call `onUploadComplete` with the local id (so the upload flow doesn't hang), or redirect to `/documents`.
    - **If online:** proceed with the existing `uploadDocument(formData)` call as before (no change to the online path).
    - Add an informational note in the success screen: when offline, the `DropZone` success message should read "Disimpan secara lokal. Akan diunggah saat Anda kembali online." — you can do this by adding an `isOfflineQueue` state flag that switches the success text.

  - [ ] 4.2 Add `getDocumentsForSync` server action
    - Open `src/app/(app)/documents/actions.ts`.
    - Add and export a new server action `getDocumentsForSync()`.
    - It must:
      1. Check authentication; return `{ success: false }` if not authenticated.
      2. Fetch all documents for the current user from Prisma: select `id`, `documentNumber`, `documentDate`, `sender`, `subject`, `summary`, `extractedText`, `r2Key`, `status`, `createdAt`.
      3. Map each document to the `LocalDocument` shape (convert Prisma's camelCase to the snake_case fields in `LocalDocument`; convert `documentDate` from `Date | null` to ISO string; set `file_blob: null`, `synced_at: new Date().toISOString()`).
      4. Return `{ success: true, documents: LocalDocument[] }`.
    - Import `LocalDocument` from `@/lib/idb`.

  - [ ] 4.3 Wire offline search in `search-view.tsx`
    - Open `src/components/search/search-view.tsx`.
    - Import `queryDocuments` from `@/lib/idb`.
    - In `runSearch`, add a branch at the top of the `try` block:
      ```ts
      if (!isOnline) {
        const localResults = await queryDocuments(searchQuery, searchFilters)
        setResults(localResults.map((doc) => ({
          id: doc.id,
          documentNumber: doc.document_number,
          sender: doc.sender,
          subject: doc.subject,
          documentDate: doc.document_date ? new Date(doc.document_date) : null,
          summary: doc.summary,
          extractedText: doc.extracted_text,
          r2Key: doc.r2_key,
        })))
        setIsNLInterpreted(false)
        return
      }
      ```
    - Update the offline `Alert` text (line 90) from `"Search requires an internet connection."` to `"Offline Mode — Searching local documents only."` (FR-015).
    - Remove the `disabled={!isOnline}` prop from `<SearchBar>` — the search bar should remain active offline so users can type and submit (FR-014). The `isLoading` prop still controls the spinner.

  - [ ] 4.4 Add offline fallback to the document viewer
    - Open `src/components/documents/document-viewer-modal.tsx`.
    - In the `useEffect` that fetches the document URL, add an `isOnline` check at the start:
      1. Add `const [isOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)` — or use the same `online`/`offline` event listener pattern as `SearchView`.
      2. If `!isOnline`, import `getDocument` from `@/lib/idb` and look up the document by `documentId`.
      3. If the local doc has a `file_blob`, create an object URL: `URL.createObjectURL(fileBlob)`, set it via `setUrl`. Store the object URL in a ref and revoke it in the cleanup function (`URL.revokeObjectURL`).
      4. If the local doc has no `file_blob`, set `setError('Dokumen tidak tersedia secara offline.')` and skip the network call.
      5. If the local doc is not found at all in IndexedDB, also set the error.

- [ ] 5.0 Sync Engine & Sync UI
  - [ ] 5.1 Create `src/lib/sync.ts` — upload pending
    - Create the file and export `async function uploadPending(): Promise<{ uploaded: number; failed: number }>`.
    - Implementation:
      1. Import `listDocuments`, `upsertDocument`, `deleteDocument` from `@/lib/idb`.
      2. Import `uploadDocument` from `@/app/(app)/upload/actions`. Note: server actions can be called from client code; import as normal.
      3. Get all documents where `status === 'pending_sync'` by calling `listDocuments()` and filtering.
      4. For each pending document:
         a. If `file_blob` is null, skip it (log a warning, mark as `failed` in IndexedDB).
         b. Create a `FormData` and append the blob as a `File`: `new File([doc.file_blob], doc.original_name ?? 'document.pdf', { type: 'application/pdf' })`.
         c. Call `uploadDocument(formData)`.
         d. On success: update the IndexedDB record — set `status: 'synced'`, `r2_key` to the returned `documentId` (note: the server action returns `documentId` which is the DB row id, not r2Key — update `id` to the server id and clear `file_blob`). Actually: remove the local record by the old id and upsert a new one with the server's id. Set `file_blob: null`.
         e. On failure: log a warning, leave the record as `pending_sync` so it retries next sync.
      5. Return counts of uploaded and failed documents.

  - [ ] 5.2 Add `downloadAll` and `syncAll` to `src/lib/sync.ts`
    - Export `async function downloadAll(): Promise<void>`.
    - Implementation:
      1. Import `upsertDocument`, `listDocuments` from `@/lib/idb`.
      2. Import `getDocumentsForSync` from `@/app/(app)/documents/actions`.
      3. Call `getDocumentsForSync()`. If `!result.success`, return early.
      4. For each document in `result.documents`:
         - Check if a local record with the same `id` exists in IndexedDB.
         - If the local record has `status === 'pending_sync'`, **skip it** (local wins — do not overwrite pending uploads).
         - Otherwise, call `upsertDocument(doc)` to insert or update the record.
    - Export `async function syncAll(): Promise<void>`.
    - Implementation: call `await uploadPending()` then `await downloadAll()`.

  - [ ] 5.3 Create `src/components/pwa/sync-button.tsx`
    - Mark as `'use client'`.
    - State:
      - `isSyncing: boolean` — true while `syncAll()` is running.
      - `lastSynced: Date | null` — timestamp of last successful sync.
      - `pendingCount: number` — count of `pending_sync` records in IndexedDB.
      - `isOnline: boolean` — tracks `navigator.onLine`.
    - On mount:
      1. Read `pendingCount` from IndexedDB: call `listDocuments()`, filter by `status === 'pending_sync'`, set count.
      2. Set `isOnline` from `navigator.onLine`.
      3. Add event listeners for `online` and `offline` window events.
      4. On `online` event: update `isOnline` to `true`, trigger `handleSync()`.
      5. On `offline` event: update `isOnline` to `false`.
    - `handleSync()` function:
      1. If `isSyncing` is already `true`, return.
      2. Set `isSyncing` to `true`.
      3. Call `await syncAll()` (import from `@/lib/sync`).
      4. Set `lastSynced` to `new Date()`.
      5. Re-read `pendingCount` from IndexedDB.
      6. Set `isSyncing` to `false`.
    - Render:
      - A `<button>` (or shadcn `Button` with `variant="ghost"` `size="icon"`) that calls `handleSync()` on click.
      - Disabled when `isSyncing` or `!isOnline`.
      - Icon logic:
        - `isSyncing` → `<Loader2 className="animate-spin" />`
        - `!isOnline` → `<CloudOff />` (from `lucide-react`)
        - `pendingCount > 0` → `<CloudUpload />`
        - otherwise → `<CloudCheck />`
      - If `pendingCount > 0` and not syncing, show a `<Badge>` with the count as an absolute-positioned overlay on the button.
      - If `lastSynced` is set and `isOnline` and not syncing, show a small text beneath: "Tersinkron [X] mnt lalu" using a simple time-ago calculation.

  - [ ] 5.4 Add `SyncButton` to the app nav header
    - Open `src/app/(app)/layout.tsx`.
    - Import `SyncButton` from `@/components/pwa/sync-button`.
    - Place `<SyncButton />` in the right section of the nav, between `<InstallPrompt />` and `<LogoutButton />`.
    - Wrap it in a `<div className="flex items-center gap-2">` together with `<InstallPrompt />` and `<LogoutButton />` for consistent alignment.

  - [ ] 5.5 Seed IndexedDB on first app load
    - Open `src/components/pwa/sync-button.tsx`.
    - In the `useEffect` that runs on mount, after setting up event listeners, check if IndexedDB is empty:
      1. Call `listDocuments()` — if the result is an empty array, trigger `handleSync()` immediately (this populates IndexedDB on first load while online).
      2. If there are already documents, do not auto-sync on mount (let the `online` event or manual button handle it) to avoid unnecessary load.
    - This ensures that a user who just installed the app and opens it online will immediately have their documents cached for future offline use.
