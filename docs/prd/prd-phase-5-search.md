# PRD: Phase 5 — Search

## 1. Introduction / Overview

Phase 5 implements the core search capability of DIAN, the feature that the entire product exists to deliver. Users can find documents by typing a natural language query ("letters from the Finance Ministry about budget 2025"), applying structured metadata filters, or combining both. Search runs entirely online against PostgreSQL and pgvector. Offline search is deferred to Phase 6.

**Mission alignment:** A user must be able to retrieve any document in less than 10 seconds using natural language.

---

## 2. Goals

1. Provide a dedicated `/search` page as the primary entry point for document retrieval.
2. Allow users to filter documents by all four core metadata fields (document number, date range, sender, subject) with only active filters shown.
3. Enable semantic search using vector similarity against stored document chunk embeddings (WO-017).
4. Enable hybrid search that combines metadata filtering with semantic ranking (WO-018).
5. Enable natural language search that uses OpenAI to parse a free-text query into structured metadata filters plus a semantic query, then runs both (WO-019).
6. Display rich result cards showing document number, sender, subject, date, AI summary excerpt, and an optional debug relevance score.
7. Keep result ranking simple for MVP: metadata filters reduce the candidate set; results are sorted by date descending within that set, with semantic score used only when semantic or hybrid search is active.

---

## 3. User Stories

- **US-01:** As an administrative staff member, I want to type a natural language query like "surat dari Kementerian Keuangan tentang anggaran 2025" and receive relevant documents, so that I do not need to remember exact metadata values.
- **US-02:** As an administrative staff member, I want to filter documents by sender and a date range without typing a query, so that I can browse correspondence from a specific office in a given period.
- **US-03:** As an administrative staff member, I want to combine a keyword/NL query with metadata filters, so that I can narrow results precisely when I have partial information.
- **US-04:** As an administrative staff member, I want each search result to show the document number, sender, subject, date, and a brief summary excerpt, so that I can identify the correct document without opening it.
- **US-05:** As an administrative staff member, I want search to work only when I am online, and to see a clear message if I am offline, so that I understand why results may be unavailable.

---

## 4. Functional Requirements

### WO-016 — Metadata Filtering

1. The system must provide a filter panel on the `/search` page with four fields: **Document Number** (text, partial match), **Date From / Date To** (date pickers), **Sender** (text, partial match), and **Subject** (text, partial match).
2. The filter panel must only display filters that have an active value ("active filters only" pattern) — empty fields are hidden from the visible chip/tag area to reduce visual clutter, but all four fields must be available to add.
3. The system must apply all active filters as AND conditions — a document must match every active filter to appear in results.
4. Applying or clearing a filter must trigger an immediate re-query without a full page reload.
5. The system must display a clear count of results found (e.g., "12 documents found").
6. Results must be sorted by `document_date` descending by default when no semantic score is present.

### WO-017 — Semantic Search

7. The system must accept a free-text search query input on the `/search` page.
8. When a query is submitted, the system must generate an embedding for the query text using OpenAI `text-embedding-3-small` on the server side.
9. The system must use pgvector cosine similarity to find `DocumentChunk` records whose embeddings are nearest to the query embedding.
10. The system must return the parent `Document` records of the top-matching chunks, de-duplicated (a document with multiple matching chunks appears once).
11. A configurable similarity threshold (default: 0.3) must filter out low-relevance results.
12. Embedding generation for queries must never run in the browser — it must be a server action or API route.

### WO-018 — Hybrid Search

13. The system must support combining metadata filters (WO-016) with semantic search (WO-017) in a single query.
14. When both metadata filters and a query text are active, the system must: first apply metadata filters to get a candidate set, then rank that candidate set by vector similarity score, then sort by similarity score descending.
15. When only metadata filters are active (no query text), the system must fall back to WO-016 behavior (date-descending sort, no semantic ranking).
16. When only a query text is active (no metadata filters), the system must run pure semantic search (WO-017) across all documents.

### WO-019 — Natural Language Search

17. When the user submits a natural language query, the system must send the raw query to OpenAI (e.g., `gpt-4o-mini`) with a structured prompt that asks it to extract any of the following from the query: `document_number`, `date_from`, `date_to`, `sender`, `subject_keywords`.
18. OpenAI must return a JSON object with the extracted fields. Any field not mentioned in the query must be returned as `null`.
19. The system must populate the metadata filter panel with the extracted values, making them visible to the user as active filters so the user can inspect, edit, or clear them.
20. The system must also use the original query (or a cleaned version) to generate a vector embedding for semantic ranking, running WO-018 hybrid search with the extracted filters and the semantic embedding together.
21. If OpenAI returns no structured fields (all null), the system must fall back to pure semantic search (WO-017) using the query as-is.
22. If the OpenAI NL parsing call fails, the system must fall back gracefully to pure semantic search without showing an error to the user.
23. The system must display an indicator (e.g., a small badge or label) showing "AI-interpreted search" when NL parsing was used, so the user understands why filters were auto-populated.

### General Search Requirements

24. The `/search` page must be a protected route (authenticated users only).
25. The system must display a message "Search requires an internet connection" and disable the search input when the user is offline (detected via `navigator.onLine`).
26. Each result card must display: document number, sender, subject, document date, and the first 150 characters of the AI-generated summary (if available). If no summary exists, show the first 150 characters of extracted text. If neither exists, show a placeholder.
27. Each result card must be clickable and open the document viewer for that document.
28. The system must show an empty state message ("No documents found. Try different keywords or adjust your filters.") when no results are returned.
29. A debug mode (enabled via a URL query param `?debug=1`) must show the cosine similarity score on each result card, for development and QA purposes only.

---

## 5. Non-Goals (Out of Scope)

- **Offline search** — deferred to Phase 6 (PWA + IndexedDB). Phase 5 is online-only.
- **Full-text keyword search against PostgreSQL** — search uses vector similarity, not `tsvector`/`tsquery`. Keyword matching is handled via metadata field partial match only.
- **Search history or saved searches** — not in MVP.
- **Sorting by fields other than date or relevance** — no custom sort controls.
- **Faceted search / aggregations** — no result counts per sender or date bucket.
- **Search result pagination** — show top N results (e.g., 20) in MVP. Pagination or infinite scroll is out of scope.
- **Relevance tuning UI** — weights between metadata and semantic scores are fixed server-side constants.
- **Cross-user or organization-wide search** — single-user MVP only.

---

## 6. Design Considerations

### Search Page Layout

```
/search
┌──────────────────────────────────────────────────┐
│  [Search bar — full width]          [Search btn] │
│  [AI-interpreted search badge — shown when NL]   │
│  ─────────────────────────────────────────────   │
│  Active filters: [Sender: X ✕] [Date: Y–Z ✕]    │
│  [+ Add filter]                                  │
│  ─────────────────────────────────────────────   │
│  12 documents found                              │
│  ┌──────────────────────────────────────────┐   │
│  │ Doc No. / Date         Sender            │   │
│  │ Subject                                  │   │
│  │ Summary excerpt...                       │   │
│  └──────────────────────────────────────────┘   │
│  [Result card 2...]                              │
└──────────────────────────────────────────────────┘
```

- Filter panel uses a chip/tag pattern — each active filter is a dismissible tag.
- A collapsed "Add filter" control opens a dropdown or inline form to add a new filter field.
- The search bar accepts any text. On submit, the system determines whether to run NL parsing based on query length and whether it resembles a structured filter vs. prose.

### UI Components

- Use existing shadcn/ui components: `Input`, `Button`, `Badge`, `Card`, `Popover`, `Calendar` (for date pickers).
- Result cards use the same visual language as the existing documents table rows.
- Offline state uses a `Alert` banner at the top of the page.

---

## 7. Technical Considerations

### API / Server Actions

- Expose a single server action or API route `searchDocuments({ query, filters })` that orchestrates all four work orders based on what inputs are provided.
- NL parsing (WO-019) must be a separate server-side step that runs before the main search, so results can be streamed back in stages if needed.
- Vector similarity queries must use pgvector's `<=>` (cosine distance) operator via `prisma.$queryRaw`.

### Query Flow

```
User submits query text
  → Server: call OpenAI gpt-4o-mini to extract structured filters (WO-019)
      → Populate filter panel with extracted values
  → Server: generate embedding for query text (WO-017)
  → Server: run hybrid search (WO-018)
      → SQL: WHERE metadata filters AND cosine_similarity >= threshold
      → ORDER BY cosine_similarity DESC
  → Return de-duplicated Document records with similarity scores
```

When no query text (filters only):

```
User applies filter(s)
  → Server: run metadata filter query (WO-016)
      → SQL: WHERE active filters
      → ORDER BY document_date DESC
  → Return Document records
```

### Database

- Vector search targets the `DocumentChunk.embedding` column (vector(1536)).
- Results are joined back to `Document` to retrieve metadata fields.
- Filtering uses standard SQL `WHERE` clauses on the `Document` table, combined with the chunk vector search via a subquery or CTE.

### Performance

- Target: full search response (including NL parsing + embedding + vector query) must complete in under 3 seconds on the server.
- OpenAI NL parsing and embedding generation run in parallel where possible (Promise.all).

### Dependencies

- Phase 4 must be complete: `DocumentChunk.embedding` fields must be populated for semantic search to return results.
- OpenAI API key must be available as an environment variable.

---

## 8. Success Metrics

1. A user can type a natural language query and receive relevant results in under 3 seconds (server response time).
2. A user can retrieve a target document from a corpus of 100+ documents in under 10 seconds end-to-end (search + click + open viewer).
3. NL parsing correctly extracts at least one structured field from 80% of realistic government document queries in Bahasa Indonesia.
4. Zero unhandled errors when OpenAI is unavailable — graceful fallback to semantic or metadata-only search in all cases.

---

## 9. Open Questions

1. **Maximum results:** Should Phase 5 cap results at 20 documents, or is there a user preference for seeing more?
2. **NL parsing language:** Should the OpenAI NL parsing prompt be bilingual (Indonesian + English), or Indonesian-only given the target user base?
3. **Query threshold:** Is cosine similarity 0.3 the right default threshold, or should it be tuned empirically against real government documents once data is available?
4. **Similarity score display:** Should the debug score be cosine distance (0–2) or converted to a percentage similarity (0–100%) for readability?
