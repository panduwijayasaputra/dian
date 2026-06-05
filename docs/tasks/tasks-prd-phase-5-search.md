# Tasks: Phase 5 — Search

Based on [prd-phase-5-search.md](../prd/prd-phase-5-search.md)

## Relevant Files

- `src/app/(app)/search/page.tsx` — New: protected server component, renders `SearchView`
- `src/app/(app)/search/actions.ts` — New: `searchDocuments` server action orchestrating all search modes
- `src/app/(app)/layout.tsx` — Add "Cari" nav link to the header
- `src/lib/parse-nl-query.ts` — New: OpenAI gpt-4o-mini NL extraction returning structured filters
- `src/lib/generate-embeddings.ts` — Reused: `generateEmbedding` called for query text embedding (WO-017)
- `src/components/search/search-view.tsx` — New: main client component — state, layout, orchestration
- `src/components/search/search-bar.tsx` — New: search input + submit button
- `src/components/search/filter-panel.tsx` — New: active filter chips + "Add filter" Popover
- `src/components/search/search-result-card.tsx` — New: individual result card with doc details + summary excerpt
- `src/components/documents/document-viewer-modal.tsx` — Reused: opened when a result card is clicked

### Notes

- Use `pnpm test` to run the test suite after each parent task.
- Install new shadcn/ui components with `pnpm dlx shadcn@latest add <component>`.
- Vector similarity queries must use `prisma.$queryRaw` — Prisma's typed query builder does not support pgvector operators.
- `generateEmbedding` in `src/lib/generate-embeddings.ts` is server-only and can be imported directly in the server action.
- The `<=>` operator in pgvector is **cosine distance** (0 = identical, 2 = opposite). Similarity = `1 - distance`. Filter: `1 - (embedding <=> query_vector) >= 0.3`.

---

## Tasks

- [x] 1.0 Search page scaffold — route, layout shell, offline detection, navigation link
  - [x] 1.1 Install required shadcn/ui components
    - Run: `pnpm dlx shadcn@latest add popover calendar`
    - These are needed for the date-range filter inputs in Task 2.
    - Verify `src/components/ui/popover.tsx` and `src/components/ui/calendar.tsx` are created.
  - [x] 1.2 Create `src/app/(app)/search/page.tsx`
    - Create a server component (no `'use client'`).
    - Import `auth` from `@/auth` and call it. If no session, redirect to `/login` using `redirect` from `next/navigation`.
    - Render `<SearchView />` (to be created in 1.3) inside a wrapper `<div>`.
    - Keep this file thin — all UI state lives in `SearchView`.
  - [x] 1.3 Create `src/components/search/search-view.tsx` as a client component shell
    - Add `'use client'` at the top.
    - Define state with `useState`:
      - `query: string` — the current text in the search bar
      - `filters: SearchFilters` — active metadata filters (define this type: `{ documentNumber?: string; sender?: string; subject?: string; dateFrom?: string; dateTo?: string }`)
      - `results: SearchResult[]` — search results (define `SearchResult` type with document fields + optional `similarity?: number`)
      - `isLoading: boolean`
      - `isNLInterpreted: boolean` — true when NL parsing populated filters
      - `hasSearched: boolean` — true after first search, used to show empty state
    - Render the layout in three sections:
      1. Search bar area (renders `<SearchBar />`)
      2. Filter area (renders `<FilterPanel />`)
      3. Results area (renders result cards or empty state)
    - For now, pass stub/empty props — wiring happens in later tasks.
  - [x] 1.4 Add offline detection and alert banner in `SearchView`
    - Add a `useEffect` that reads `navigator.onLine` and listens to `window` events `'online'` and `'offline'` to set an `isOnline: boolean` state variable.
    - At the top of the returned JSX, if `!isOnline`, render an `Alert` (shadcn/ui) with the text: `"Search requires an internet connection"` and disable the search `Input`.
    - Import `Alert` and `AlertDescription` from `@/components/ui/alert` — install it first if needed: `pnpm dlx shadcn@latest add alert`.
  - [x] 1.5 Add "Cari" nav link to `src/app/(app)/layout.tsx`
    - In the nav's link group, add a new `<Link href="/search">` after the "Unggah" link:
      ```tsx
      <Link href="/search" className="hover:text-foreground transition-colors">
        Cari
      </Link>
      ```

- [x] 2.0 Metadata filtering (WO-016) — server action, filter panel, active chips
  - [x] 2.1 Create `src/app/(app)/search/actions.ts` with the `searchDocuments` server action signature and metadata-only path
    - Add `'use server'` at the top.
    - Import `auth` from `@/auth` and `prisma` from `@/lib/prisma`.
    - Define types:
      ```ts
      export type SearchFilters = {
        documentNumber?: string
        sender?: string
        subject?: string
        dateFrom?: string
        dateTo?: string
      }

      export type SearchResult = {
        id: string
        documentNumber: string | null
        sender: string | null
        subject: string | null
        documentDate: Date | null
        summary: string | null
        extractedText: string | null
        r2Key: string | null
        similarity?: number
      }

      export type SearchResponse = {
        success: boolean
        results: SearchResult[]
        isNLInterpreted: boolean
        error?: string
      }
      ```
    - Export `async function searchDocuments(query: string, filters: SearchFilters): Promise<SearchResponse>`.
    - At the top of the function, call `auth()` — if no session, return `{ success: false, results: [], isNLInterpreted: false, error: 'Not authenticated.' }`.
    - If `query` is empty and no filters are active, return `{ success: true, results: [], isNLInterpreted: false }` immediately.
    - **Metadata-only path** (no `query`): use `prisma.document.findMany` with:
      - `where.userId = session.user.id`
      - If `filters.documentNumber`: `documentNumber: { contains: filters.documentNumber, mode: 'insensitive' }`
      - If `filters.sender`: `sender: { contains: filters.sender, mode: 'insensitive' }`
      - If `filters.subject`: `subject: { contains: filters.subject, mode: 'insensitive' }`
      - If `filters.dateFrom` or `filters.dateTo`: `documentDate: { gte: ..., lte: ... }` (convert strings to `new Date(...)`)
      - `orderBy: { documentDate: 'desc' }` and `take: 20`
      - Select only the fields in `SearchResult` (id, documentNumber, sender, subject, documentDate, summary, extractedText, r2Key)
    - Map results to `SearchResult[]` (no `similarity`) and return `{ success: true, results, isNLInterpreted: false }`.
  - [x] 2.2 Create `src/components/search/search-bar.tsx`
    - Client component with an `<Input>` and a `<Button type="submit">`.
    - Props: `value: string`, `onChange: (v: string) => void`, `onSubmit: () => void`, `isLoading: boolean`, `disabled?: boolean`.
    - Render a `<form onSubmit={...}>` that calls `onSubmit()` on submit.
    - Show a loading spinner or disable the button while `isLoading` is true.
    - Placeholder text: `"Cari dokumen... (contoh: surat dari Kementerian Keuangan)"`.
  - [x] 2.3 Create `src/components/search/filter-panel.tsx`
    - Client component.
    - Props: `filters: SearchFilters`, `onChange: (filters: SearchFilters) => void`.
    - Render active filters as dismissible chips (shadcn `Badge` with an `✕` button).
      - For each key in `filters` that has a non-empty value, render one chip showing the field label and value. Example: `Pengirim: Kementerian Keuangan ✕`.
      - Clicking ✕ calls `onChange({ ...filters, [key]: undefined })`.
    - Render an "Tambah filter" (`+ Add filter`) button that opens a `Popover`.
    - Inside the Popover:
      - Show a list of available filter fields not yet active: Document Number, Pengirim (Sender), Perihal (Subject), Tanggal (Date range).
      - Selecting a field shows an inline `Input` (or two `Calendar` date pickers for Tanggal) to enter the value.
      - On confirm (Enter or a small "Terapkan" button), call `onChange({ ...filters, [selectedField]: enteredValue })` and close the Popover.
  - [x] 2.4 Wire `SearchBar`, `FilterPanel`, and `searchDocuments` together in `SearchView`
    - Pass `query` / `setQuery` to `<SearchBar>`.
    - Pass `filters` / `setFilters` to `<FilterPanel>`.
    - In `SearchView`, define `handleSearch`: set `isLoading = true`, call `searchDocuments(query, filters)`, set `results`, `isNLInterpreted`, `hasSearched = true`, then `isLoading = false`.
    - Call `handleSearch` from `SearchBar.onSubmit` and also whenever `filters` changes (use `useEffect` on `filters` if `hasSearched` is already true, so filters re-run search after first query).

- [x] 3.0 Semantic search server action (WO-017) — query embedding + pgvector similarity
  - [x] 3.1 Add semantic search path to `searchDocuments` in `src/app/(app)/search/actions.ts`
    - Import `generateEmbedding` from `@/lib/generate-embeddings`.
    - When `query` is non-empty and there are no active metadata filters, run the **semantic-only path**:
      - Call `const queryVector = await generateEmbedding(query)`.
      - If `queryVector` is null (OpenAI call failed), fall back to returning an empty result set with `success: true` — do not throw.
      - Run a raw SQL query using `prisma.$queryRaw`:
        ```sql
        SELECT
          d.id,
          d."documentNumber",
          d.sender,
          d.subject,
          d."documentDate",
          d.summary,
          d."extractedText",
          d."r2Key",
          MAX(1 - (dc.embedding <=> ${JSON.stringify(queryVector)}::vector)) AS similarity
        FROM "Document" d
        JOIN "DocumentChunk" dc ON dc."documentId" = d.id
        WHERE d."userId" = ${userId}
          AND dc.embedding IS NOT NULL
          AND 1 - (dc.embedding <=> ${JSON.stringify(queryVector)}::vector) >= 0.3
        GROUP BY d.id, d."documentNumber", d.sender, d.subject, d."documentDate", d.summary, d."extractedText", d."r2Key"
        ORDER BY similarity DESC
        LIMIT 20
        ```
      - Cast `similarity` values from the raw query to `number` (they come back as strings from pg).
      - Return `{ success: true, results, isNLInterpreted: false }`.
  - [x] 3.2 Verify de-duplication and similarity threshold
    - The `GROUP BY d.id` in the raw query already de-duplicates — a document with multiple matching chunks appears once with the best (MAX) similarity score.
    - The `>= 0.3` threshold filters out low-relevance results.
    - Confirm the query works by manually testing with a known document in the dev database (run the dev server: `pnpm dev`).

- [x] 4.0 Hybrid search + NL parsing orchestration (WO-018 + WO-019)
  - [x] 4.1 Create `src/lib/parse-nl-query.ts`
    - Add `import 'server-only'` at the top.
    - Import and instantiate the OpenAI client (same pattern as `generate-summary.ts`).
    - Define and export a type:
      ```ts
      export type ParsedQuery = {
        document_number: string | null
        sender: string | null
        subject_keywords: string | null
        date_from: string | null  // ISO date string YYYY-MM-DD or null
        date_to: string | null
      }
      ```
    - Export `async function parseNlQuery(query: string): Promise<ParsedQuery | null>`.
    - If `query.trim()` is empty, return `null`.
    - Call `gpt-4o-mini` with `response_format: { type: 'json_object' }` and this system prompt:
      ```
      You are a search query parser for a government document archive system.
      Extract structured fields from the user's search query.
      Return a JSON object with these fields (use null if not mentioned):
      - document_number: exact or partial document number
      - sender: name of the sending office or person
      - subject_keywords: key topic words (not a full sentence)
      - date_from: start date in YYYY-MM-DD format
      - date_to: end date in YYYY-MM-DD format
      Support both Bahasa Indonesia and English queries.
      ```
    - Pass the user's `query` as the user message.
    - Parse the JSON response. If parsing fails or any field is missing, fill missing fields with `null`.
    - Wrap the entire call in try/catch — on any error, return `null`.
  - [x] 4.2 Add hybrid search path to `searchDocuments`
    - When `query` is non-empty **and** at least one filter is active, run the **hybrid path**:
      - Generate the query embedding: `const queryVector = await generateEmbedding(query)`.
      - Build metadata WHERE conditions as SQL fragments. Use parameterized values (never string interpolation).
      - Run a raw SQL query similar to 3.1 but with added `AND` conditions on `Document` fields for each active filter.
      - Example additional clauses:
        - `AND d.sender ILIKE '%' || ${filters.sender} || '%'` (when sender is set)
        - `AND d."documentNumber" ILIKE '%' || ${filters.documentNumber} || '%'`
        - `AND d."documentDate" >= ${new Date(filters.dateFrom)}`
        - `AND d."documentDate" <= ${new Date(filters.dateTo)}`
      - Sort by `similarity DESC`, limit 20.
      - If `queryVector` is null, fall back to metadata-only path (the Prisma `findMany` from Task 2.1).
  - [x] 4.3 Add NL parsing step to `searchDocuments` as the first step when a query is present
    - At the top of `searchDocuments`, when `query` is non-empty:
      - Call `const parsed = await parseNlQuery(query)`.
      - If `parsed` is not null and has at least one non-null field:
        - Merge parsed fields into `filters`:
          - `parsed.sender` → `filters.sender` (only if not already set by the user)
          - `parsed.document_number` → `filters.documentNumber`
          - `parsed.subject_keywords` → `filters.subject`
          - `parsed.date_from` → `filters.dateFrom`
          - `parsed.date_to` → `filters.dateTo`
        - Set `isNLInterpreted = true`.
      - If `parsed` is null or all fields are null, set `isNLInterpreted = false` and proceed with the query as-is.
    - Return the final `isNLInterpreted` value in `SearchResponse`.
  - [x] 4.4 Update `SearchView` to handle NL-interpreted results
    - After `searchDocuments` returns, if `isNLInterpreted` is true:
      - Update `filters` state with the NL-extracted values (the server action returns these in the response — add a `parsedFilters?: SearchFilters` field to `SearchResponse` to carry them back).
      - This makes the filter chips visible so the user can inspect and edit the auto-populated filters.
    - Show a small `Badge` or label below the search bar reading `"AI menafsirkan pencarian Anda"` (AI interpreted your search) when `isNLInterpreted` is true.
    - The badge should disappear if the user manually edits a filter or clears the query.

- [x] 5.0 Search result cards, count, empty state, and debug mode
  - [x] 5.1 Create `src/components/search/search-result-card.tsx`
    - Client component.
    - Props: `result: SearchResult`, `similarity?: number`, `showDebug?: boolean`, `onOpen: (result: SearchResult) => void`.
    - Render using shadcn `Card`:
      - Top row: document number (bold) on the left, formatted `documentDate` on the right.
      - Second row: sender in muted text.
      - Third row: subject.
      - Fourth row: excerpt — first 150 characters of `summary`, or first 150 of `extractedText` if no summary, or italicized `"Tidak ada ringkasan tersedia"` if neither.
      - If `showDebug && similarity != null`: show a small `Badge` at the bottom-right with the similarity score formatted as a percentage: `Math.round(similarity * 100) + '%'`.
    - The entire card is wrapped in a `<button>` or has an `onClick` that calls `onOpen(result)`.
  - [x] 5.2 Wire result cards to document viewer in `SearchView`
    - Import `DocumentViewerModal` from `@/components/documents/document-viewer-modal.tsx`.
    - Add state: `selectedDocument: SearchResult | null`.
    - Render `<DocumentViewerModal>` at the bottom of `SearchView`, passing `selectedDocument?.id` and controlling open/close.
    - Pass `onOpen={(result) => setSelectedDocument(result)}` to each `<SearchResultCard>`.
  - [x] 5.3 Add result count and empty state to `SearchView`
    - Above the result cards, when `hasSearched` is true, show:
      - If `results.length > 0`: `"{results.length} dokumen ditemukan"`
      - If `results.length === 0`: a centered message — `"Tidak ada dokumen ditemukan. Coba kata kunci lain atau ubah filter."` with a muted subtext — `"Pastikan Anda terhubung ke internet untuk pencarian semantik."`.
  - [x] 5.4 Add debug mode
    - In `src/app/(app)/search/page.tsx`, read the `debug` URL search param from the `searchParams` prop (Next.js passes this to server components).
    - Pass `debug={searchParams.debug === '1'}` as a prop to `<SearchView>`.
    - In `SearchView`, pass `showDebug={debug}` down to each `<SearchResultCard>`.
    - This causes the similarity score badge to appear on each card when `?debug=1` is in the URL.
