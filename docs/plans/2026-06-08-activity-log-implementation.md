# Activity Log Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Record all significant user and system activities across auth, documents, users, and divisions — then expose an admin-only filterable log table at `/log-aktivitas`.

**Architecture:** A single `ActivityLog` Prisma model written to by a shared `logActivity()` utility called inside existing server actions. The admin page is a server-rendered Next.js page that reads filter params from the URL and queries the DB directly.

**Tech Stack:** Prisma, Next.js App Router server actions, shadcn/ui Table + Select + Input, Lucide icons.

---

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add ActivityLog model and User relation**

In `prisma/schema.prisma`, add a relation field to the existing `User` model and a new `ActivityLog` model at the bottom:

```prisma
// Inside model User — add after the `documents` field:
  activityLogs ActivityLog[]

// New model — add at end of file:
model ActivityLog {
  id          String   @id @default(cuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  action      String
  resourceId  String?
  information String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

**Step 2: Run migration**

```bash
pnpm prisma migrate dev --name add_activity_log
```

Expected: migration file created, client regenerated.

**Step 3: Verify client compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ActivityLog model to schema"
```

---

### Task 2: Logging Utility

**Files:**
- Create: `src/lib/activity-log.ts`

**Step 1: Create the utility**

```ts
import { prisma } from '@/lib/prisma'

interface LogParams {
  userId?: string | null
  action: string
  resourceId?: string | null
  information?: string | null
}

export async function logActivity(params: LogParams): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        resourceId: params.resourceId ?? null,
        information: params.information ?? null,
      },
    })
  } catch (err) {
    console.error('[activity-log] failed to write log:', err)
  }
}
```

**Step 2: Verify it compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/activity-log.ts
git commit -m "feat: add logActivity utility"
```

---

### Task 3: Auth Logging

**Files:**
- Modify: `src/auth.ts`
- Create: `src/app/(auth)/login/logout-action.ts`
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Log LOGIN and LOGIN_FAILED in the authorize callback**

In `src/auth.ts`, update the `authorize` function. Add the import at the top, then add log calls:

```ts
// Add import at top:
import { logActivity } from '@/lib/activity-log'

// Update authorize callback — replace the existing return statements:
async authorize(credentials) {
  if (!credentials?.username || !credentials?.password) return null

  const user = await prisma.user.findUnique({
    where: { username: credentials.username as string },
  })

  if (!user) {
    await logActivity({
      action: 'AUTH_LOGIN_FAILED',
      information: `Username tidak ditemukan: ${credentials.username}`,
    })
    return null
  }

  const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
  if (!valid) {
    await logActivity({
      userId: user.id,
      action: 'AUTH_LOGIN_FAILED',
      resourceId: user.id,
      information: `Password salah untuk: ${user.username}`,
    })
    return null
  }

  if (!user.isActive) {
    await logActivity({
      userId: user.id,
      action: 'AUTH_LOGIN_FAILED',
      resourceId: user.id,
      information: `Akun tidak aktif: ${user.username}`,
    })
    return null
  }

  await logActivity({
    userId: user.id,
    action: 'AUTH_LOGIN',
    resourceId: user.id,
    information: `Login berhasil: ${user.name}`,
  })

  return {
    id: user.id,
    name: user.name,
    email: user.username,
    role: user.role,
    divisionId: user.divisionId,
    isActive: user.isActive,
  }
},
```

**Step 2: Create logout server action**

Create `src/app/(auth)/login/logout-action.ts`:

```ts
'use server'

import { auth, signOut } from '@/auth'
import { logActivity } from '@/lib/activity-log'

export async function logoutAction() {
  const session = await auth()
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      action: 'AUTH_LOGOUT',
      resourceId: session.user.id,
      information: `Logout: ${session.user.name}`,
    })
  }
  await signOut({ redirectTo: '/login' })
}
```

**Step 3: Update sidebar to use logoutAction**

In `src/components/layout/sidebar.tsx`, import the logout action and replace the `signOut()` call:

```ts
// Add import at top (after existing imports):
import { logoutAction } from '@/app/(auth)/login/logout-action'

// Replace the signOut() onClick handler on the logout button with:
onClick={() => logoutAction()}
```

Find the button that currently calls `signOut()` — it looks like:
```tsx
<Button variant="ghost" ... onClick={() => signOut()}>
```
Change it to:
```tsx
<Button variant="ghost" ... onClick={() => logoutAction()}>
```

**Step 4: Verify compilation**

```bash
pnpm tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/auth.ts src/app/(auth)/login/logout-action.ts src/components/layout/sidebar.tsx
git commit -m "feat: log AUTH_LOGIN, AUTH_LOGIN_FAILED, AUTH_LOGOUT"
```

---

### Task 4: Document Logging

**Files:**
- Modify: `src/app/(app)/upload/actions.ts`
- Modify: `src/app/(app)/documents/actions.ts`
- Modify: `src/app/(app)/search/actions.ts`

**Step 1: Log DOCUMENT_UPLOAD in upload/actions.ts**

Add import and log call after `prisma.document.create`:

```ts
// Add import at top:
import { logActivity } from '@/lib/activity-log'

// After `const document = await prisma.document.create(...)`, add:
await logActivity({
  userId: session.user.id,
  action: 'DOCUMENT_UPLOAD',
  resourceId: document.id,
  information: `Unggah: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`,
})
```

**Step 2: Log DOCUMENT_DOWNLOAD in getDocumentViewUrl (documents/actions.ts)**

Add import and log call after `const url = await getPresignedUrl(...)`:

```ts
// Add import at top:
import { logActivity } from '@/lib/activity-log'

// After `const url = await getPresignedUrl(document.r2Key)`, add:
await logActivity({
  userId: session.user.id,
  action: 'DOCUMENT_DOWNLOAD',
  resourceId: documentId,
  information: `Unduh: ${document.originalName ?? documentId}`,
})
```

**Step 3: Log DOCUMENT_METADATA_SAVE in saveDocumentMetadata (documents/actions.ts)**

After the `$transaction` and `createMany` calls, add before `return { success: true, document: updated }`:

```ts
await logActivity({
  userId: session.user.id,
  action: 'DOCUMENT_METADATA_SAVE',
  resourceId: documentId,
  information: `Simpan metadata: ${values.subject ?? documentId}`,
})
```

**Step 4: Log DOCUMENT_METADATA_SAVE in updateDocumentMetadata (documents/actions.ts)**

Similarly, add before `return { success: true }` in `updateDocumentMetadata`:

```ts
await logActivity({
  userId: session.user.id,
  action: 'DOCUMENT_METADATA_SAVE',
  resourceId: documentId,
  information: `Update metadata: ${values.subject ?? documentId}`,
})
```

**Step 5: Log DOCUMENT_DELETE in deleteDocument (documents/actions.ts)**

Add after `await prisma.document.delete(...)`, before `return { success: true }`:

```ts
await logActivity({
  userId: session.user.id,
  action: 'DOCUMENT_DELETE',
  resourceId: documentId,
  information: `Hapus dokumen: ${document.originalName ?? documentId}`,
})
```

**Step 6: Log DOCUMENT_SEARCH in searchDocuments (search/actions.ts)**

Add import and a log call near the top of `searchDocuments`, after the empty-query early return:

```ts
// Add import at top:
import { logActivity } from '@/lib/activity-log'

// After the `if (!trimmedQuery && !hasActiveFilters(filters)) { return ... }` block, add:
void logActivity({
  userId: session.user.id,
  action: 'DOCUMENT_SEARCH',
  information: trimmedQuery ? `Query: "${trimmedQuery}"` : 'Filter only',
}).catch(() => {})
// Note: void + catch — search must never be blocked by a log failure
```

**Step 7: Verify compilation**

```bash
pnpm tsc --noEmit
```

**Step 8: Commit**

```bash
git add src/app/(app)/upload/actions.ts src/app/(app)/documents/actions.ts src/app/(app)/search/actions.ts
git commit -m "feat: log document upload, download, metadata save, delete, search"
```

---

### Task 5: User Management Logging

**Files:**
- Modify: `src/app/(app)/pengguna/actions.ts`

**Step 1: Add import**

```ts
import { logActivity } from '@/lib/activity-log'
```

Also add `auth` session reading where needed — `requireAdmin()` already calls auth, but the actions that do write operations need the actor's userId. Add a session fetch at the start of each mutating action, or read it from the existing session inside requireAdmin.

The simplest approach: each mutating action already calls `requireAdmin()`. Add a `getAdminSession()` helper that returns the session user after the admin check:

```ts
async function getAdminId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return null
  return session.user.id
}
```

**Step 2: Log USER_CREATE in createUser**

After `await prisma.user.create(...)` succeeds, add:

```ts
const adminId = await getAdminId()
await logActivity({
  userId: adminId ?? undefined,
  action: 'USER_CREATE',
  resourceId: /* capture the created user id */ createdUser.id,
  information: `Buat pengguna: ${name.trim()} (${username.trim()})`,
})
```

Capture the created user: change `await prisma.user.create(...)` to `const createdUser = await prisma.user.create(...)`.

**Step 3: Log USER_UPDATE in updateUser**

After `await prisma.user.update(...)` succeeds:

```ts
const adminId = await getAdminId()
await logActivity({
  userId: adminId ?? undefined,
  action: 'USER_UPDATE',
  resourceId: id,
  information: `Update pengguna: ${name.trim()} (${username.trim()})`,
})
```

**Step 4: Log USER_ACTIVATE / USER_DEACTIVATE in toggleUserActive**

After `await prisma.user.update(...)`:

```ts
const adminId = await getAdminId()
await logActivity({
  userId: adminId ?? undefined,
  action: user.isActive ? 'USER_DEACTIVATE' : 'USER_ACTIVATE',
  resourceId: id,
  information: `${user.isActive ? 'Nonaktifkan' : 'Aktifkan'} pengguna`,
})
```

**Step 5: Verify compilation**

```bash
pnpm tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/app/(app)/pengguna/actions.ts
git commit -m "feat: log user create, update, activate, deactivate"
```

---

### Task 6: Division Logging

**Files:**
- Modify: `src/app/(app)/divisi/actions.ts`

**Step 1: Add import and getAdminId helper**

```ts
import { logActivity } from '@/lib/activity-log'

async function getAdminId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return null
  return session.user.id
}
```

**Step 2: Log DIVISION_CREATE in createDivision**

Change `await prisma.division.create(...)` to capture the result, then log:

```ts
const created = await prisma.division.create({ data: { name: trimmed, color } })
const adminId = await getAdminId()
await logActivity({
  userId: adminId ?? undefined,
  action: 'DIVISION_CREATE',
  resourceId: created.id,
  information: `Buat divisi: ${trimmed}`,
})
```

**Step 3: Log DIVISION_UPDATE in updateDivision**

After `await prisma.division.update(...)`:

```ts
const adminId = await getAdminId()
await logActivity({
  userId: adminId ?? undefined,
  action: 'DIVISION_UPDATE',
  resourceId: id,
  information: `Update divisi: ${trimmed}`,
})
```

**Step 4: Log DIVISION_DELETE in deleteDivision**

After `await prisma.division.delete(...)`:

```ts
const adminId = await getAdminId()
await logActivity({
  userId: adminId ?? undefined,
  action: 'DIVISION_DELETE',
  resourceId: id,
  information: `Hapus divisi`,
})
```

**Step 5: Verify compilation**

```bash
pnpm tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/app/(app)/divisi/actions.ts
git commit -m "feat: log division create, update, delete"
```

---

### Task 7: Admin Log Page

**Files:**
- Create: `src/app/(app)/log-aktivitas/page.tsx`

**Step 1: Create the server page with filters + table**

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const PAGE_SIZE = 50

const CATEGORIES = ['AUTH', 'DOCUMENT', 'USER', 'DIVISION'] as const

interface Props {
  searchParams: Promise<{
    userId?: string
    category?: string
    from?: string
    to?: string
    page?: string
  }>
}

export default async function LogAktivitasPage({ searchParams }: Props) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/')

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  const where: Record<string, unknown> = {}
  if (params.userId) where.userId = params.userId
  if (params.category) where.action = { startsWith: params.category + '_' }
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(params.to + 'T23:59:59') } : {}),
    }
  }

  const [logs, total, users] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
    prisma.activityLog.count({ where }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const merged = { ...params, ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    return `/log-aktivitas?${p.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log Aktivitas</h1>
        <p className="mt-1 text-sm text-slate-500">{total} entri ditemukan</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Pengguna</label>
          <select
            name="userId"
            defaultValue={params.userId ?? ''}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="">Semua Pengguna</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Kategori</label>
          <select
            name="category"
            defaultValue={params.category ?? ''}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="">Semua Kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Dari</label>
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ''}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Sampai</label>
          <input
            type="date"
            name="to"
            defaultValue={params.to ?? ''}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          />
        </div>

        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white"
        >
          Filter
        </button>
        <a
          href="/log-aktivitas"
          className="h-9 rounded-md border px-4 text-sm font-medium flex items-center"
        >
          Reset
        </a>
      </form>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Waktu</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead className="w-36">Resource ID</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-400 py-12">
                  Tidak ada log.
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                  {format(log.createdAt, 'dd MMM yyyy HH:mm:ss', { locale: localeId })}
                </TableCell>
                <TableCell className="text-sm">
                  {log.user?.name ?? <span className="text-slate-400 italic">System</span>}
                </TableCell>
                <TableCell>
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-mono font-medium bg-slate-100 text-slate-700">
                    {log.action}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-400">
                  {log.resourceId ? log.resourceId.slice(-8) : '—'}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {log.information ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end text-sm">
          {page > 1 && (
            <a href={buildUrl({ page: String(page - 1) })} className="rounded border px-3 py-1">
              ← Sebelumnya
            </a>
          )}
          <span className="text-slate-500">
            Halaman {page} dari {totalPages}
          </span>
          {page < totalPages && (
            <a href={buildUrl({ page: String(page + 1) })} className="rounded border px-3 py-1">
              Berikutnya →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Install date-fns if not present**

```bash
pnpm list date-fns
```

If not installed:
```bash
pnpm add date-fns
```

**Step 3: Verify compilation**

```bash
pnpm tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/app/(app)/log-aktivitas/
git commit -m "feat: add admin log aktivitas page with filters"
```

---

### Task 8: Sidebar Menu Item

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Add ClipboardList import and menu entry**

At the top of the file, add `ClipboardList` to the lucide-react import:

```ts
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Building2,
  Users,
  ClipboardList,  // add this
  Menu,
  LogOut,
} from 'lucide-react'
```

In the `menuAdmin` array, add the new entry:

```ts
const menuAdmin = [
  { href: '/divisi', label: 'Divisi', icon: Building2 },
  { href: '/pengguna', label: 'Pengguna', icon: Users },
  { href: '/log-aktivitas', label: 'Log Aktivitas', icon: ClipboardList },
]
```

**Step 2: Verify compilation**

```bash
pnpm tsc --noEmit
```

**Step 3: Run tests**

```bash
pnpm test
```

**Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Log Aktivitas to admin sidebar"
```
