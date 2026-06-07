# Activity Log Design

**Date:** 2026-06-08

## Goal

Record all significant user and system activities across auth, documents, users, and divisions. Provide an admin-only page to browse and filter logs.

## Data Model

New `ActivityLog` table added to Prisma schema:

```prisma
model ActivityLog {
  id          String   @id @default(cuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  action      String   // CATEGORY_VERB convention, e.g. "AUTH_LOGIN"
  resourceId  String?  // ID of the entity acted upon (documentId, userId, etc.)
  information String?  // Human-readable detail
  createdAt   DateTime @default(now())
}
```

`action` uses a plain string with `CATEGORY_VERB` convention so filtering by prefix works without a separate enum column.

### Tracked Actions

| Category | Actions |
|---|---|
| AUTH | LOGIN, LOGIN_FAILED, LOGOUT |
| DOCUMENT | UPLOAD, METADATA_SAVE, DELETE, DOWNLOAD, SEARCH |
| USER | CREATE, UPDATE, ACTIVATE, DEACTIVATE, DELETE, PASSWORD_CHANGE |
| DIVISION | CREATE, UPDATE, DELETE |

## Logging Utility

```ts
// src/lib/activity-log.ts
export async function logActivity(params: {
  userId?: string
  action: string
  resourceId?: string
  information?: string
}): Promise<void>
```

Called from server actions and API routes. Failures are caught and logged to console — they must never break the primary operation.

## Admin Page

- **Route:** `/log-aktivitas`
- **Access:** ADMIN only (redirect others to `/`)
- **Rendering:** Server-side with URL search params for filters

### Filters

- User (dropdown of all users)
- Category (AUTH / DOCUMENT / USER / DIVISION)
- Date from / Date to

### Table Columns

| Column | Value |
|---|---|
| Waktu | createdAt formatted as local datetime |
| Pengguna | user.name (or "System" if userId is null) |
| Aksi | action string |
| Resource ID | resourceId (truncated cuid) |
| Keterangan | information |

- Newest first
- Paginated: 50 rows per page

## Sidebar

Add "Log Aktivitas" with `ClipboardList` icon to the Manajemen section (admin-only), pointing to `/log-aktivitas`.
