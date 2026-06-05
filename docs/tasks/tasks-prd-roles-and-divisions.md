# Tasks: Roles and Division-Based Access Control

Based on: `docs/prd/prd-roles-and-divisions.md`

## Relevant Files

- `prisma/schema.prisma` - Add `Division` model, `DocumentDivision` junction model, `Role` enum; alter `User` with `role`, `divisionId`, `isActive`.
- `prisma/migrations/` - New migration for schema changes.
- `prisma/seed.ts` - Update seed to set `role: ADMIN` and `isActive: true` on the default admin user.
- `src/types/next-auth.d.ts` - NEW: Extend NextAuth `Session` and `JWT` types with `role`, `divisionId`, `isActive`.
- `src/auth.ts` - Extend JWT/session callbacks to include `role`, `divisionId`, `isActive`; block inactive users in `authorize`.
- `src/proxy.ts` - Extended with role-based route guards for `/admin/*` and `/upload/*` (admin only).
- `src/app/(admin)/layout.tsx` - NEW: Admin section layout with admin nav.
- `src/app/(admin)/admin/page.tsx` - NEW: Admin dashboard redirect.
- `src/app/(admin)/admin/divisions/page.tsx` - NEW: Division list page (server component).
- `src/app/(admin)/admin/divisions/divisions-client.tsx` - NEW: Division list client component with create/edit/delete UI.
- `src/app/(admin)/admin/divisions/actions.ts` - NEW: Server actions for division CRUD.
- `src/app/(admin)/admin/users/page.tsx` - NEW: User list page (server component).
- `src/app/(admin)/admin/users/users-client.tsx` - NEW: User list client component with create/edit/toggle-active UI.
- `src/app/(admin)/admin/users/actions.ts` - NEW: Server actions for user CRUD and toggle active.
- `src/components/admin/division-form.tsx` - NEW: Create/edit division form.
- `src/components/admin/division-table.tsx` - NEW: Division table with edit/delete actions.
- `src/components/admin/user-form.tsx` - NEW: Create/edit user form with role and division fields.
- `src/components/admin/user-table.tsx` - NEW: User table with status badge and edit/toggle actions.
- `src/components/documents/division-select.tsx` - NEW: Multi-select component for assigning divisions to a document.
- `src/components/documents/metadata-form.tsx` - Add optional `divisionIds` field and `divisions` prop.
- `src/components/documents/metadata-review-sheet.tsx` - Pass `divisions` list to `MetadataForm` (admin only).
- `src/app/(app)/layout.tsx` - Hide "Unggah" nav link for regular users; add "Admin" link for admins.
- `src/app/(app)/documents/actions.ts` - Apply division-based access filter; persist division assignments on save.
- `src/app/(app)/documents/[id]/settings/settings-form.tsx` - Add division multi-select to metadata edit (admin only).
- `src/app/(app)/search/actions.ts` - Replace `userId` filtering with division-based filtering for regular users.
- `src/lib/idb.ts` - Add `division_ids` to `LocalDocument`; increment DB version; filter `queryDocuments` by division.
- `src/lib/sync.ts` - Include `division_ids` when syncing documents from server to IndexedDB.

### Notes

- Run `pnpm prisma migrate dev --name <migration_name>` after schema changes.
- Run `pnpm prisma generate` to regenerate the Prisma client after schema changes.
- Run `pnpm prisma db seed` to re-seed the admin user with the new role and isActive fields.
- Use `pnpm test` to run the full test suite before each parent task commit.
- The IndexedDB version must be incremented in `openDB()` when `LocalDocument` schema changes.
- The `(admin)` route group in Next.js App Router means files under `src/app/(admin)/` are served at `/admin/...` (the group name is not part of the URL).

---

## Tasks

- [x] 1.0 Database Schema & Migrations
  - [x] 1.1 Add `Role` enum and new fields to the `User` model in `prisma/schema.prisma`
    - Add `enum Role { ADMIN USER }` above the existing enums.
    - Add three new fields to the `User` model:
      - `role Role @default(USER)` — every new user defaults to regular user.
      - `divisionId String? @map("division_id")` — nullable FK, will reference `Division`.
      - `isActive Boolean @default(true) @map("is_active")` — active by default.
    - Add the relation field: `division Division? @relation(fields: [divisionId], references: [id])`.
  - [x] 1.2 Add the `Division` model to `prisma/schema.prisma`
    - Create a new model block:
      ```
      model Division {
        id                String              @id @default(cuid())
        name              String              @unique
        createdAt         DateTime            @default(now())
        users             User[]
        documentDivisions DocumentDivision[]
      }
      ```
  - [x] 1.3 Add the `DocumentDivision` junction model to `prisma/schema.prisma`
    - Create a new model block:
      ```
      model DocumentDivision {
        id         String   @id @default(cuid())
        documentId String   @map("document_id")
        document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
        divisionId String   @map("division_id")
        division   Division @relation(fields: [divisionId], references: [id], onDelete: Cascade)
        @@unique([documentId, divisionId])
      }
      ```
    - Add `divisions DocumentDivision[]` to the existing `Document` model.
  - [x] 1.4 Run the Prisma migration and regenerate the client
    - Run: `pnpm prisma migrate dev --name add_divisions_and_roles`
    - Run: `pnpm prisma generate`
    - Verify no errors in the generated client under `src/generated/prisma/`.
  - [x] 1.5 Update `prisma/seed.ts` to assign `role: 'ADMIN'` and `isActive: true` to the default admin user
    - In the `create` block of the `upsert`, add `role: 'ADMIN'` and `isActive: true`.
    - Also add them to the `update` block so the existing admin user gets updated if already seeded.
    - Run: `pnpm prisma db seed` and confirm the log shows success.

- [x] 2.0 Auth Session & Route Protection
  - [x] 2.1 Create `src/types/next-auth.d.ts` to extend session and JWT types
    - Create the file and declare a module augmentation for `next-auth`:
      ```typescript
      declare module 'next-auth' {
        interface User {
          role: 'ADMIN' | 'USER'
          divisionId: string | null
          isActive: boolean
        }
        interface Session {
          user: User & { id: string }
        }
      }
      declare module 'next-auth/jwt' {
        interface JWT {
          role: 'ADMIN' | 'USER'
          divisionId: string | null
          isActive: boolean
        }
      }
      ```
  - [x] 2.2 Update `src/auth.ts` to add role/divisionId/isActive to the session
    - In the `authorize` callback: after verifying the password, check `if (!user.isActive) return null`. (NextAuth does not support custom error messages from `authorize`, so `null` triggers the generic login error. The login form will handle showing the inactive message separately.)
    - Return `{ id, name, email, role, divisionId, isActive }` from `authorize`.
    - Add a `callbacks` block with a `jwt` callback: when `trigger === 'signIn'`, copy `role`, `divisionId`, `isActive` from `user` into the `token`.
    - Add a `session` callback: copy `token.role`, `token.divisionId`, `token.isActive` into `session.user`.
  - [x] 2.3 Extend `src/proxy.ts` with role-based route guards for admin and upload routes
    - Export the `auth` handler as middleware using NextAuth's `auth` export.
    - Protect `/admin/*`: if the user is not authenticated, redirect to `/login`; if authenticated but `role !== 'ADMIN'`, redirect to `/documents`.
    - Protect `/upload/*`: if `role !== 'ADMIN'`, redirect to `/documents`.
    - All other `(app)` routes: if not authenticated, redirect to `/login`.
    - Export a `config` with `matcher` to apply middleware to `/(app)/*`, `/admin/*`, `/upload/*`.

- [x] 3.0 Admin Panel (Divisions & Users)
  - [x] 3.1 Create the `(admin)` route group with layout and dashboard page
    - Create `src/app/(admin)/layout.tsx` — a simple layout with an admin nav header containing links to `/admin/divisions` and `/admin/users`, plus a "Back to App" link.
    - Create `src/app/(admin)/admin/page.tsx` — immediately redirects to `/admin/divisions` using `redirect('/admin/divisions')`.
  - [x] 3.2 Create division server actions in `src/app/(admin)/admin/divisions/actions.ts`
    - `getDivisions()`: return all divisions ordered by name, each including `_count` of users and `_count` of documentDivisions.
    - `createDivision(name: string)`: validate name is non-empty, create the division, return `{ success, error? }`.
    - `updateDivision(id: string, name: string)`: validate name is non-empty, update the division name, return `{ success, error? }`.
    - `deleteDivision(id: string)`: before deleting, check if any users have this `divisionId` OR any `DocumentDivision` rows reference it. If yes, return `{ success: false, error: 'Divisi tidak dapat dihapus karena masih memiliki pengguna atau dokumen.' }`. If safe, delete and return `{ success: true }`.
    - All actions must call `auth()` and return an error if the caller is not `ADMIN`.
  - [x] 3.3 Create `src/components/admin/division-form.tsx`
    - A simple form component with a single `name` text input and a submit button.
    - Accepts props: `defaultValues?: { name: string }`, `onSubmit: (name: string) => Promise<void>`, `isSubmitting: boolean`, `submitLabel: string`.
  - [x] 3.4 Create `src/components/admin/division-table.tsx`
    - Renders a table of divisions with columns: Name, Users, Documents, Actions.
    - Actions column has "Edit" (opens inline edit mode or a dialog) and "Delete" buttons.
    - Delete button calls `deleteDivision` server action and shows a toast error if blocked.
  - [x] 3.5 Create division list page at `src/app/(admin)/admin/divisions/page.tsx`
    - Server component that fetches divisions using `getDivisions()`.
    - Renders a "Tambah Divisi" button that opens a create form.
    - Renders `DivisionTable` with the fetched divisions.
  - [x] 3.6 Create user server actions in `src/app/(admin)/admin/users/actions.ts`
    - `getUsers()`: return all users including their division name, ordered by name.
    - `createUser({ name, username, password, role, divisionId })`: hash the password with bcrypt, create the user. If `role === 'USER'` and `divisionId` is null, return an error.
    - `updateUser(id, { name, username, role, divisionId })`: update the user's fields. Enforce the same rule: a `USER` role must have a `divisionId`.
    - `toggleUserActive(id)`: read current `isActive`, flip it, save.
    - All actions must call `auth()` and return an error if the caller is not `ADMIN`.
  - [x] 3.7 Create `src/components/admin/user-form.tsx`
    - Form fields: `name` (text), `username` (text), `password` (password — only shown when creating, not editing), `role` (select: Admin / User), `divisionId` (select — only shown when role is "User").
    - The division select should be populated from a `divisions` prop passed in.
    - Accepts props: `defaultValues?`, `onSubmit`, `isSubmitting`, `submitLabel`, `divisions`, `isEditing: boolean`.
  - [x] 3.8 Create `src/components/admin/user-table.tsx`
    - Table with columns: Name, Username, Role, Division, Status (Active/Inactive badge), Actions.
    - Actions: "Edit" button and "Aktifkan"/"Nonaktifkan" toggle button.
  - [x] 3.9 Create user list page at `src/app/(admin)/admin/users/page.tsx`
    - Server component that fetches users and divisions.
    - Renders a "Tambah Pengguna" button.
    - Renders `UserTable`.

- [x] 4.0 Document Access Control (Server-Side)
  - [x] 4.1 Create `src/components/documents/division-select.tsx`
    - A multi-select component (can use multiple `<Checkbox>` items inside a dropdown, or shadcn/ui `Popover` + checkboxes).
    - Props: `value: string[]` (selected division IDs), `onChange: (ids: string[]) => void`, `divisions: { id: string; name: string }[]`.
    - Shows selected division names as chips/badges below the selector.
  - [x] 4.2 Update `src/components/documents/metadata-form.tsx`
    - Add `divisionIds?: string[]` to the `MetadataFormValues` type.
    - Add optional props: `divisions?: { id: string; name: string }[]`.
    - If the `divisions` prop is provided, render the `DivisionSelect` component as a new field below the existing fields.
    - Wire the select's value and onChange to the form state.
  - [x] 4.3 Update `src/components/documents/metadata-review-sheet.tsx`
    - Add optional `divisions?: { id: string; name: string }[]` prop.
    - Pass `divisions` down to `MetadataForm`.
    - The parent upload flow (`upload-flow.tsx`) must pass `divisions` only when the user is an admin (fetch the list server-side and pass it as a prop to the client component).
  - [x] 4.4 Update `src/app/(app)/upload/upload-flow.tsx` to pass divisions to the review sheet
    - Fetch all divisions server-side (this component is rendered by a Server Component parent).
    - Pass the list to `MetadataReviewSheet` via the `divisions` prop so admins see the division selector.
  - [x] 4.5 Update `saveDocumentMetadata` in `src/app/(app)/documents/actions.ts`
    - Accept `divisionIds?: string[]` as part of `MetadataFormValues`.
    - After saving the document metadata, delete all existing `DocumentDivision` rows for this document, then insert new ones for each `divisionId` in the list (this is a simple replace-all approach).
    - Wrap both the delete and insert in a Prisma transaction.
  - [x] 4.6 Update `getDocumentViewUrl` in `src/app/(app)/documents/actions.ts` to enforce division access
    - Read `session.user.role` and `session.user.divisionId` from the session.
    - If admin: allow access to any document.
    - If regular user: instead of checking `document.userId === session.user.id`, query whether a `DocumentDivision` row exists where `documentId = document.id AND divisionId = session.user.divisionId`. If not found, return `{ success: false, error: 'Document not found.' }`.
  - [x] 4.7 Update the document list query to filter by division
    - In whichever server action or page fetches the document list for the `(app)/documents/page.tsx`:
      - If admin: `prisma.document.findMany({ where: { status: { not: 'LOCAL' } } })`.
      - If regular user: `prisma.document.findMany({ where: { divisions: { some: { divisionId: session.user.divisionId } } } })`.
  - [x] 4.8 Update `src/app/(app)/search/actions.ts` to filter by division
    - In `metadataSearch`: replace the `where: { userId }` condition with the division-based condition (admin sees all; regular user filters via `divisions: { some: { divisionId } }`).
    - In `semanticSearch` and `hybridSearch`: add a JOIN on `DocumentDivision` and a `WHERE dd."divisionId" = ${divisionId}` clause for regular users. For admins, omit the join.
    - Extract the role/divisionId from `session.user` at the top of `searchDocuments` and thread it into all three helper functions.
  - [x] 4.9 Update `src/app/(app)/layout.tsx` to show role-specific navigation
    - Call `auth()` to get the session (this is a Server Component).
    - Conditionally render the "Unggah" nav link only if `session.user.role === 'ADMIN'`.
    - Conditionally render an "Admin" nav link only if `session.user.role === 'ADMIN'`, pointing to `/admin`.
  - [x] 4.10 Update `src/app/(app)/documents/[id]/settings/settings-form.tsx` to include division editing
    - Fetch current `DocumentDivision` rows for this document (pass as a prop from the parent server page).
    - Fetch all divisions (pass as a prop).
    - Render `DivisionSelect` in the form only if the user is admin.
    - On save, call an updated server action that also persists the new `divisionIds` (same replace-all approach as 4.5).

- [ ] 5.0 Offline Division Filtering (IndexedDB)
  - [ ] 5.1 Update `LocalDocument` interface in `src/lib/idb.ts`
    - Add `division_ids: string[]` to the `LocalDocument` interface. Default to `[]` for documents that have no divisions.
  - [ ] 5.2 Increment the IndexedDB version and handle the upgrade
    - Change `idbOpen<DianDB>('dian-db', 1, ...)` to version `2`.
    - In the `upgrade` function, add a version check: `if (oldVersion < 2) { /* no structural change needed; new field defaults to [] */ }`. This ensures existing documents (which lack `division_ids`) are still readable — access code must default `division_ids` to `[]` when the field is undefined.
  - [ ] 5.3 Update `queryDocuments` in `src/lib/idb.ts` to accept and apply a division filter
    - Add a `divisionId: string | null` parameter to the function signature.
    - After fetching all documents matching the query/filter, add a final filter step: if `divisionId` is not null, keep only documents where `doc.division_ids.includes(divisionId)`.
    - If `divisionId` is null (admin), return all results unfiltered.
  - [ ] 5.4 Update `src/lib/sync.ts` to include `division_ids` when syncing from server
    - In the sync function that pulls documents from the server and writes them to IndexedDB, add a query to include `divisions` (the `DocumentDivision` relation) when fetching documents from Prisma.
    - Map the result to extract the array of `divisionId` strings and assign it as `division_ids` on the `LocalDocument` before calling `upsertDocument`.
  - [ ] 5.5 Pass the user's `divisionId` to the offline search caller
    - In the client component that calls `queryDocuments` for offline search (in `src/app/(app)/search/page.tsx` or `search-view.tsx`), read the user's `divisionId` from the session (via `useSession()` or a server prop).
    - Pass `divisionId` (or `null` for admin) as an argument to `queryDocuments`.
