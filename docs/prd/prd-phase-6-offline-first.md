# PRD: Phase 6 — Offline First

## 1. Introduction / Overview

Phase 6 delivers the offline-first foundation that transforms DIAN from an online-only tool into a resilient Progressive Web App (PWA). Government staff often work in environments with unreliable connectivity. This phase ensures that documents already seen can still be found offline, documents can be queued for upload when offline, and everything synchronises automatically (with a manual fallback) when connectivity returns.

Three work orders are covered:

- **WO-020 — PWA Setup:** Web App Manifest, service worker, app shell caching, and install prompt.
- **WO-021 — IndexedDB Storage:** Local document store schema, CRUD utilities, offline upload queue, and offline search wired to the existing search view.
- **WO-022 — Sync Engine:** Bidirectional sync triggered automatically on reconnection and manually by the user.

**Mission alignment:** Documents must be retrievable in less than 10 seconds even without an internet connection, using locally cached data.

---

## 2. Goals

1. Make DIAN installable as a PWA on desktop and mobile browsers.
2. Cache the app shell (HTML, CSS, JS, fonts, icons) so the UI loads instantly even offline.
3. Store documents (metadata + extracted text + summary) in IndexedDB so they are searchable without a server connection.
4. Allow users to upload PDFs while offline; queue them for automatic upload when connectivity returns.
5. Sync bidirectionally: push pending uploads to the server and pull the latest server documents into IndexedDB.
6. Trigger sync automatically on reconnection; provide a manual sync button as a fallback.
7. Resolve write conflicts by letting the local (pending) version win.
8. Wire the existing offline detection in `SearchView` to an IndexedDB-backed search implementation.

---

## 3. User Stories

- **US-01:** As an administrative staff member, I want to install DIAN on my desktop so that I can open it directly without a browser tab.
- **US-02:** As an administrative staff member, I want the app to load and be navigable even when I have no internet, so that I can still access documents I have previously viewed.
- **US-03:** As an administrative staff member, I want to search my locally cached documents when offline, so that I can find correspondence without needing a server connection.
- **US-04:** As an administrative staff member, I want to upload a PDF while offline, so that I do not lose the document if connectivity drops during my work session.
- **US-05:** As an administrative staff member, I want my pending uploads and local cache to sync automatically when I reconnect, so that I do not have to think about syncing.
- **US-06:** As an administrative staff member, I want a manual sync button so that I can force a sync if something looks out of date.
- **US-07:** As an administrative staff member, I want to see how many documents are pending sync, so that I always know the state of my local queue.

---

## 4. Functional Requirements

### WO-020 — PWA Setup

**FR-001** The app must include a Web App Manifest (`/public/manifest.json`) with the following fields: `name` ("DIAN"), `short_name` ("DIAN"), `start_url` ("/"), `display` ("standalone"), `theme_color`, `background_color`, and at least two icon sizes (192×192 and 512×512).

**FR-002** The manifest must be linked in the Next.js root layout via `<link rel="manifest">`.

**FR-003** A service worker must be registered in the root layout. It must activate immediately on install and claim all clients without waiting for a page reload.

**FR-004** The service worker must cache the app shell on install: all static assets emitted by the Next.js build (JS chunks, CSS, fonts, icons, manifest).

**FR-005** The service worker must use a **cache-first** strategy for static assets and a **network-first** strategy for all navigation requests (HTML pages), falling back to a cached `/offline` page if the network is unavailable.

**FR-006** An `/offline` page must exist and inform the user that they are viewing a cached version of the app.

**FR-007** When the browser fires `beforeinstallprompt`, the app must capture the event and display an "Install App" button in the navigation header. Clicking it triggers the native install dialog. The button must disappear after installation.

**FR-008** The service worker must NOT intercept requests to `/api/*` or Next.js server actions — these are network-only and must fail gracefully when offline.

---

### WO-021 — IndexedDB Storage

**FR-009** A single IndexedDB database named `dian-db` (version 1) must be created with one object store: `documents`.

**FR-010** The `documents` store must use `id` (UUID string) as its keyPath and include the following indexes:

| Index name | Field | Notes |
|---|---|---|
| `by_status` | `status` | for filtering pending_sync |
| `by_sender` | `sender` | for offline filter |
| `by_date` | `document_date` | for offline date sort |

**FR-011** Each document record in IndexedDB must contain:

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Primary key |
| `document_number` | string | |
| `document_date` | string (ISO date) | |
| `sender` | string | |
| `subject` | string | |
| `summary` | string \| null | AI-generated summary |
| `extracted_text` | string \| null | Raw PDF text, used for offline full-text search |
| `status` | `'local' \| 'pending_sync' \| 'synced' \| 'processing' \| 'ready' \| 'failed'` | |
| `r2_key` | string \| null | Set after successful server upload |
| `file_blob` | Blob \| null | PDF bytes; only present for `pending_sync` records |
| `created_at` | string (ISO) | |
| `synced_at` | string (ISO) \| null | Last time this record was synced from server |

**FR-012** A `lib/idb.ts` module must export typed helper functions: `openDB`, `upsertDocument`, `getDocument`, `listDocuments`, `deleteDocument`, and `queryDocuments` (for offline search).

**FR-013** When a user uploads a PDF while offline, the upload flow must detect the offline state, store the PDF `Blob` and the user-entered metadata in IndexedDB with `status: 'pending_sync'`, and show a confirmation that the document has been queued.

**FR-014** When offline, the `SearchView` must query IndexedDB instead of calling the `searchDocuments` server action. The offline search must support:
- Substring match on `document_number`, `sender`, `subject`
- Substring match on `summary` and `extracted_text`
- Exact or range filter on `document_date`

**FR-015** The existing offline banner in `SearchView` must be updated from "Search requires an internet connection" to "Offline Mode — Searching local documents only."

**FR-016** Offline search results must use the same `SearchResultCard` component as online search, using locally cached fields (no server round-trip).

**FR-017** When offline, the document viewer must open documents from `file_blob` (for `pending_sync` records) or from the cached R2 URL. If neither is available, show a "Document not available offline" message.

---

### WO-022 — Sync Engine

**FR-018** A `lib/sync.ts` module must export a `syncAll()` function that performs both directions of sync sequentially: upload pending documents first, then download the latest server documents.

**FR-019** **Upload sync:** `syncAll()` must read all IndexedDB records with `status: 'pending_sync'`, upload each PDF `Blob` and its metadata to the server (reusing the existing upload server action), and on success update the record's status and clear `file_blob`.

**FR-020** **Download sync:** After uploading, `syncAll()` must fetch the full document list from the server and upsert each record into IndexedDB, setting `synced_at` to the current timestamp. Records already present with `status: 'pending_sync'` must NOT be overwritten (local wins).

**FR-021** **Auto-sync:** The app must listen for the browser `online` event. When fired, `syncAll()` must be called automatically.

**FR-022** **Manual sync:** A sync icon button must appear in the navigation header. Clicking it calls `syncAll()` manually. While syncing, the button must show a spinner and be disabled. After completion, it must show "Last synced: [time]".

**FR-023** A badge must display the count of `pending_sync` documents next to the sync button (e.g., "3 pending"). The badge must disappear when the count reaches zero.

**FR-024** If any document fails to upload during sync, it must remain in `pending_sync` state. The sync must continue with the remaining documents and report a non-blocking error (console warning is acceptable for MVP).

**FR-025** On first app load (and after each successful download sync), all server documents must be upserted into IndexedDB so that offline search has a complete local cache.

---

## 5. Non-Goals (Out of Scope)

- OCR of PDF content — text must already be extracted server-side (WO-011).
- Background sync via the Web Background Synchronization API — the `online` event and manual button are sufficient for MVP.
- Selective caching of individual PDF files for offline viewing — only `pending_sync` blobs are stored locally.
- Push notifications for sync completion.
- Per-field conflict resolution UI — local always wins silently.
- Multi-device conflict detection.
- IndexedDB encryption.

---

## 6. Design Considerations

### Offline Banner (Search Page)
Replace current alert text with: **"Offline Mode — Searching local documents only"**. Keep the same `Alert` component and styling.

### Sync Button (Navigation Header)
- Location: right side of nav header, left of the user avatar/logout button.
- States:
  - **Idle (synced):** cloud-check icon, "Last synced: 2 min ago"
  - **Pending:** cloud-upload icon + badge with count (e.g., "3")
  - **Syncing:** spinner icon, disabled
  - **Offline:** cloud-off icon, disabled, no badge

### Install Button (Navigation Header)
- Only visible when `beforeinstallprompt` has fired and the app is not yet installed.
- Use a "Download" or "Install" icon with label "Install App".
- Dismiss permanently once installed.

### Offline Upload Confirmation
- In the upload flow, replace the success screen with: "Dokumen disimpan secara lokal. Akan diunggah saat Anda kembali online."
- Show a `pending_sync` status badge on the document in the documents list.

---

## 7. Technical Considerations

### Service Worker Strategy
Use `next-pwa` (wraps Workbox) or a hand-written service worker in `public/sw.js` with a build-step cache manifest. Given the project uses a custom VPS (not Vercel), a custom service worker is preferred to avoid Workbox version drift.

### IndexedDB Library
Use the `idb` npm package (lightweight typed wrapper) rather than raw IndexedDB APIs to avoid callback complexity.

### Sync Concurrency
Run upload sync sequentially (one document at a time) to avoid overwhelming the server. Download sync is a single `fetch` of the full list.

### Existing Upload Flow Integration
The existing `upload-flow.tsx` calls a server action. Wrap that call: check `navigator.onLine` first; if offline, route to IndexedDB instead.

### Existing Search View Integration
`SearchView` already tracks `isOnline`. Add a branch in `runSearch`: when `!isOnline`, call `queryDocuments(query, filters)` from `lib/idb.ts` and format results to match `SearchResult[]`.

### Service Worker Scope
Register at root scope (`/`). Exclude `/api/*` from caching via `denylist` pattern in the fetch handler.

---

## 8. Success Metrics

1. A user can open the app and see their document list with zero network requests (all served from cache/IndexedDB).
2. A user can perform a keyword search offline and receive results from IndexedDB within 1 second.
3. A document uploaded offline successfully appears in the server database within 30 seconds of the user reconnecting.
4. The app scores ≥ 90 on Lighthouse PWA audit (installable, service worker registered, manifest present).
5. Zero data loss: no `pending_sync` documents are silently dropped during sync.

---

## 9. Open Questions

1. Should the "Install App" button also appear on mobile browsers (iOS Safari does not support `beforeinstallprompt`)? If so, a manual "Add to Home Screen" instruction modal may be needed for iOS.
2. Is there a maximum PDF size that should be rejected for offline storage? Large blobs in IndexedDB can cause storage quota issues on some devices.
3. Should the documents list page also reflect IndexedDB data when offline, or should it show a static "offline" placeholder?
