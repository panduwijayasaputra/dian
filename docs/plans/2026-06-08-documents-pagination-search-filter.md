# Documents Pagination, Search & Filter — Design

**Date:** 2026-06-08

## Overview

Move documents page from client-side filtering (all docs fetched at once) to server-side pagination + search + filter driven by URL params. Offline mode falls back to IndexedDB with client-side pagination.

## URL Structure

```
/documents?page=1&q=foo&type=INCOMING&status=READY&division=xxx&pageSize=20
```

All params are optional. Defaults: `page=1`, `pageSize=20`.

## Data Layer

Server component runs two queries in parallel with the same `WHERE` clause:

```ts
const [documents, total] = await Promise.all([
  prisma.document.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select: ... }),
  prisma.document.count({ where }),
])
```

`skip = (page - 1) * pageSize`, `take = pageSize`.

Search matches `documentNumber`, `subject`, `sender` case-insensitively via `contains + mode: insensitive`.

## Dual-Mode Architecture

| Mode    | Data source  | State management          | Trigger               |
|---------|-------------|--------------------------|----------------------|
| Online  | PostgreSQL   | URL params via router.push | navigator.onLine=true |
| Offline | IndexedDB    | Local React state          | navigator.onLine=false |

`useOnlineStatus()` hook listens to `window` online/offline events. Coming back online triggers `router.refresh()` to re-enter server mode.

## Components

### `documents/page.tsx` (server component)
- Reads `searchParams`
- Runs paginated DB query
- Passes `{ documents, total, page, pageSize, q, type, status, division }` to `DocumentsView`

### `DocumentsView` (client component)
- Branches on `useOnlineStatus()`
- Online: filter/page changes → `router.push()` with updated URL params; search debounces 300ms
- Offline: loads all from IDB on mount, local state for filters + pagination, client-side slice
- Shows "Mode Offline — menampilkan dokumen lokal" banner when offline

### `PaginationControls` (new, presentational)
- Prev / page numbers (max 5 with ellipsis) / Next
- Page size selector: 10 / 20 / 50 per page
- Receives: `page`, `totalPages`, `pageSize`, `onPageChange`, `onPageSizeChange`

## Offline Banner

```
⚠ Mode Offline — menampilkan dokumen lokal saja
```

Shown at top of DocumentsView when offline.
