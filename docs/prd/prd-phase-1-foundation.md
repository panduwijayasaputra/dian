# PRD: Phase 1 — Foundation (WO-001, WO-002, WO-003)

## 1. Introduction / Overview

This PRD covers the foundational setup for DIAN — the scaffolding that all future features will be built on top of. It is not a user-facing feature itself; it is infrastructure. Without it, no subsequent work order can begin.

Phase 1 delivers three things in sequence:

1. **WO-001** — A working Next.js application with the full toolchain configured.
2. **WO-002** — A connected PostgreSQL database with pgvector and Prisma managing the schema.
3. **WO-003** — A credential-based authentication system so that only authorised staff can access the app.

**Goal:** By the end of Phase 1, a developer can clone the repo, run two commands, and have a working authenticated app connected to a local database.

---

## 2. Goals

- G-1: The project runs locally with `pnpm dev` after minimal setup steps.
- G-2: The database schema is version-controlled via Prisma migrations and can be applied with one command.
- G-3: All routes except `/login` are protected — unauthenticated users are redirected to `/login`.
- G-4: An authenticated user can log in with a username and password, and log out.
- G-5: The codebase follows consistent style (ESLint + Prettier) enforced at lint time.

---

## 3. User Stories

**US-1 — Developer setup**
As a developer, I want to clone the repo and run `pnpm install && pnpm dev` so that I have a working local environment within minutes.

**US-2 — Database migration**
As a developer, I want to run `pnpm db:migrate` so that my local PostgreSQL database matches the current schema without manual SQL.

**US-3 — Login**
As an authorised staff member, I want to enter my username and password on the login page so that I can access DIAN.

**US-4 — Invalid credentials**
As a user who enters the wrong password, I want to see a clear error message so that I know my login attempt failed.

**US-5 — Protected access**
As an unauthenticated visitor, when I navigate to any page other than `/login`, I want to be automatically redirected to `/login` so that I cannot access restricted content.

**US-6 — Logout**
As a logged-in staff member, I want to click a logout button so that my session ends and I am redirected to `/login`.

**US-7 — Admin creates users**
As an admin, I want to seed user accounts into the database so that staff can log in without a self-registration flow.

---

## 4. Functional Requirements

### WO-001 — Project Setup

- FR-1.1: The project must be initialised with Next.js (App Router), TypeScript, Tailwind CSS, and shadcn/ui.
- FR-1.2: ESLint must be configured with the Next.js recommended ruleset.
- FR-1.3: Prettier must be configured and must run via `pnpm format` and `pnpm format:check`.
- FR-1.4: A `.env.example` file must document every required environment variable with placeholder values.
- FR-1.5: A `README.md` must include local setup instructions (prerequisites, install, env setup, db migrate, dev server).
- FR-1.6: The default Next.js boilerplate pages must be removed. The root `/` route must render a minimal placeholder page that confirms the app is running.

### WO-002 — Database Setup

- FR-2.1: Prisma must be configured as the ORM with a PostgreSQL provider.
- FR-2.2: The `pgvector` extension must be enabled in the database. Prisma schema must reference the `vector` type via the `pgvector` Prisma extension.
- FR-2.3: The initial migration must create a `users` table with at minimum: `id`, `name`, `username` (unique), `password_hash`, `created_at`, `updated_at`.
- FR-2.4: A seed script must create at least one default admin user. Seed credentials (username and password) are hardcoded in the seed script for simplicity.
- FR-2.5: `pnpm db:migrate` must apply all pending Prisma migrations **and** automatically run the seed script afterward.
- FR-2.6: `pnpm db:studio` must open Prisma Studio for local data inspection.

### WO-003 — Authentication

- FR-3.1: Authentication must use NextAuth.js (Auth.js v5) with the Credentials provider.
- FR-3.2: Passwords must be stored as bcrypt hashes. Plain-text passwords must never be stored.
- FR-3.3: On successful login, the user must be redirected to `/` (the app home/dashboard).
- FR-3.4: On failed login (wrong username or password), the login form must display the message: `"Username atau password salah."` No distinction between "user not found" and "wrong password" (security best practice).
- FR-3.5: All routes under `/(app)` must be protected by Next.js middleware. Unauthenticated requests must redirect to `/login`.
- FR-3.6: The `/login` route must be publicly accessible and must not redirect logged-in users back to itself infinitely.
- FR-3.7: A logout action must terminate the session and redirect to `/login`.
- FR-3.8: Session strategy must be JWT (no database session table required at this stage).

---

## 5. Non-Goals (Out of Scope)

- Password reset / forgot password flow.
- Email verification.
- Self-registration by users.
- Role-based access control (RBAC) — all authenticated users have the same access level in Phase 1.
- OAuth / social login.
- Two-factor authentication.
- Any document upload, search, or metadata feature.

---

## 6. Design Considerations

- **Style:** Clean minimal — white/gray backgrounds, shadcn/ui defaults, no custom colour palette required in Phase 1.
- **Login page:** Centred card layout with the DIAN text wordmark (no logo asset), username field, password field, and a submit button. No "remember me" toggle.
- **App shell:** A minimal layout with a top navigation bar that includes the app name and a logout button. Content area is a placeholder for future pages.
- **Language:** All UI copy in Indonesian (e.g., `"Masuk"` for the login button, `"Keluar"` for logout).

---

## 7. Technical Considerations

- **Next.js version:** 15 (App Router).
- **Auth.js version:** v5 (beta) — config lives in `auth.ts` at the project root.
- **Prisma:** Use `prisma/schema.prisma`. Migrations live in `prisma/migrations/`.
- **pgvector:** The `vector` column type is not needed in Phase 1 but the extension must be enabled and Prisma must be wired to support it so Phase 4 (embeddings) has no setup friction.
- **Middleware:** `middleware.ts` at the project root handles route protection using the Auth.js `auth` export.
- **Environment variables required:**
  - `DATABASE_URL` — PostgreSQL connection string
  - `NEXTAUTH_SECRET` — random secret for JWT signing
  - `NEXTAUTH_URL` — base URL (e.g., `http://localhost:3000`)

---

## 8. Success Metrics

- A developer can go from `git clone` to a running, authenticated app in under 5 minutes following the README.
- `pnpm lint` passes with zero errors on a fresh checkout.
- Navigating to `/` while unauthenticated redirects to `/login`.
- Logging in with seeded credentials lands on `/`.
- Logging out redirects to `/login`.

---

## 9. Decisions

- OQ-1 → Seed credentials are hardcoded in the seed script for simplicity.
- OQ-2 → Login page uses a text wordmark — no logo asset yet.
- OQ-3 → `pnpm db:migrate` runs migrations and seed automatically.
