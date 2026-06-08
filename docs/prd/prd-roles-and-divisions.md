# PRD: Roles and Division-Based Access Control

## 1. Introduction / Overview

DIAN currently operates as a single-tenant system where all authenticated users share the same document space. This feature introduces **divisions** (organizational units) and **roles** (admin, user) to enforce document-level access control.

A regular user belongs to one division and can only see documents assigned to that division. An admin has full access to all documents and manages users and divisions.

**Goal:** Ensure that documents are only visible to staff within the relevant division, while giving admins full control over users, divisions, and all documents.

---

## 2. Goals

- Introduce a `divisions` table to represent organizational units.
- Add a `role` field (`admin` | `user`) and an optional `division_id` to the existing `users` table.
- Restrict document visibility so that regular users only see documents assigned to their division.
- Give admins full visibility over all documents regardless of division assignment.
- Allow admins to manage users (create, edit, toggle active/inactive) and manage divisions (create, edit, delete).
- Documents with no division assigned are only visible to admins.

---

## 3. User Stories

**As an admin**, I want to create and manage divisions so that I can reflect the organizational structure of the office.

**As an admin**, I want to create user accounts and assign them to a division so that staff can log in and access their division's documents.

**As an admin**, I want to toggle a user's active/inactive status so that I can revoke access without deleting their account.

**As an admin**, I want to see all documents regardless of division so that I can manage the entire document archive.

**As a regular user**, I want to log in and automatically see only documents from my division so that I am not exposed to documents outside my scope.

**As a regular user**, I want to search within my division's documents so that results are always relevant to my work.

**As an admin**, I want to assign one or more divisions to a document so that multiple divisions can access shared correspondence.

---

## 4. Functional Requirements

### 4.1 Division Management

1. The system must have a `divisions` table with fields: `id`, `name`, `created_at`.
2. Admins must be able to create a division by providing a name.
3. Admins must be able to edit a division's name.
4. Admins must be able to delete a division **only if** it has no users and no documents assigned to it. If it does, the delete action must be blocked with a clear error message.
5. The division list must be visible in the admin panel.

### 4.2 User Roles

6. The `users` table must have a `role` column with values `admin` or `user`.
7. The `users` table must have a nullable `division_id` foreign key referencing the `divisions` table.
8. A user with role `user` must have a `division_id` assigned. A user with role `admin` does not require one.
9. The first admin user must be seeded via a database migration or seed script.

### 4.3 User Management (Admin Only)

10. Admins must be able to create a new user account with fields: name, email, password, role, and (if role is `user`) division.
11. Admins must be able to edit an existing user's name, email, role, and division.
12. Admins must be able to toggle a user's status between **active** and **inactive**.
13. Inactive users must not be able to log in. If an inactive user attempts to log in, the system must show a clear error message (e.g., "Your account is inactive. Please contact your administrator.").
14. The user list in the admin panel must display: name, email, role, division (if applicable), and active/inactive status.

### 4.4 Document Access Control

15. A document may have zero or more divisions assigned to it (stored in a `document_divisions` junction table).
16. A regular user can only view a document if **at least one** of the document's assigned divisions matches the user's division.
17. Documents with **no division assigned** are only visible to admins.
18. An admin can see and access **all documents** regardless of division assignment.
19. All search results (online and offline) must be filtered by the user's division before being returned to a regular user.

### 4.5 Document Upload (Scope Restriction)

20. Only admins can upload documents.
21. Regular users have no access to the upload interface.

### 4.6 Division Assignment on Documents

22. When an admin uploads or edits a document, they must be able to assign one or more divisions to it (optional).
23. The document metadata review screen must include a division selector (multi-select) visible only to admins.

---

## 5. Non-Goals (Out of Scope)

- A user belonging to multiple divisions simultaneously.
- Users creating or managing divisions.
- Regular users uploading documents.
- Granular per-document permissions beyond division membership.
- Audit logs for admin actions (may be addressed in a future work order).
- Notifications when documents are added to a user's division.

---

## 6. Design Considerations

- The admin panel should be a dedicated section (e.g., `/admin`) separate from the regular user interface.
- Division selector on documents should use a multi-select component (e.g., shadcn/ui `Combobox` or `MultiSelect`).
- The user management table should have clear visual indicators for active/inactive status (e.g., a badge or toggle switch).
- Regular users should not see any UI elements related to upload, user management, or division management.

---

## 7. Technical Considerations

- **Schema changes:**
  - New table: `divisions (id, name, created_at)`
  - New junction table: `document_divisions (document_id, division_id)`
  - Alter `users` table: add `role` (enum: `admin`, `user`), add `division_id` (nullable FK → `divisions`)
- **Existing documents:** On migration, all existing documents will have no divisions assigned (admin-only access). A follow-up admin action is required to assign them to divisions.
- **Existing users:** Existing users must be manually assigned a role and division via migration or the admin panel.
- **Offline search (IndexedDB):** The offline search layer must filter by `division_id` before returning results. The user's `division_id` must be stored in the client session or IndexedDB at login time.
- **Auth session:** The user's `role` and `division_id` must be included in the session token (JWT or server session) so access checks can be made without a DB query on every request.
- **Middleware:** A Next.js middleware or server action guard must enforce role-based access on all admin routes and document access endpoints.
- **Delete guard:** Before deleting a division, the server must check both `users.division_id` and `document_divisions.division_id` for any references.

---

## 8. Success Metrics

- A regular user logging in sees **only** documents from their division — no documents from other divisions appear in search results or document lists.
- An admin can create a user, assign them to a division, and the user can immediately log in and access the correct documents.
- Division deletion is blocked correctly when the division has associated users or documents.
- An inactive user cannot log in.
- All existing admin-facing workflows (upload, metadata review) continue to function correctly.

---

## 9. Open Questions

- Should the admin panel be accessible at `/admin` or integrated into the existing navigation with role-based visibility?
- Should admins be able to reassign documents from one division to another in bulk, or only one document at a time?
- What is the desired password policy for admin-created user accounts (auto-generated, temporary, or admin-set)?
