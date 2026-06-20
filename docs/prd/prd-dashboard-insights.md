# PRD: Dashboard Insights

## 1. Introduction / Overview

The Beranda (home) page currently displays hardcoded mock data — static numbers and a fake document list. This feature replaces all mock data with real, database-driven statistics, a trend chart, a document type breakdown, and a live recent documents table.

The goal is to give admins an org-wide operational view and give regular users a division-scoped view of document activity — all loaded automatically when they open the app.

---

## 2. Goals

- Replace every hardcoded value on the dashboard with real data from the database.
- Show role-appropriate data: admins see org-wide stats, regular users see only their division's data.
- Provide a 30-day daily upload trend chart for both roles.
- Provide a document type breakdown chart for admins only.
- Show 5 most recent documents as a clickable table for both roles.
- Display month-over-month change indicators on all stat cards.

---

## 3. User Stories

**As an admin,** I want to see the total number of documents, how many were added this month, how many divisions and users are active, so that I can monitor the health of the archive at a glance.

**As an admin,** I want to see a bar chart of daily document uploads for the past 30 days, so that I can identify periods of high or low activity.

**As an admin,** I want to see a breakdown of documents by type (Surat Masuk, Nota Dinas, SK, etc.), so that I understand what kinds of documents dominate the archive.

**As a regular user,** I want to see document counts scoped to my division, so that I can understand the activity in my area without being overwhelmed by org-wide data.

**As a regular user,** I want to see how many searches I performed this month, so that I have a sense of my personal usage.

**As any user,** I want to click a row in the recent documents table and be taken directly to that document's viewer.

---

## 4. Functional Requirements

1. The system must fetch all dashboard data from the database on page load — no mock/hardcoded values.
2. The system must detect the logged-in user's role (`ADMIN` or `USER`) and `divisionId` from the session.
3. **Admin stat cards (4):**
   - Total documents with status `READY`
   - Documents with status `READY` created in the current calendar month, with change vs. last month
   - Count of divisions that have at least one `READY` document, out of total divisions
   - Count of users where `isActive = true`, out of total users
4. **User stat cards (3):**
   - Total `READY` documents in the user's division
   - `READY` documents in the user's division created this month, with change vs. last month
   - Count of `ActivityLog` entries where `action = 'SEARCH'` and `userId = current user` for the current month, with change vs. last month
5. Each stat card must display a change indicator: `+N dari bulan lalu` (green), `−N dari bulan lalu` (red), or `sama seperti bulan lalu` (slate).
6. The system must display a bar chart of daily document upload counts for the past 30 days.
   - Admin: all `READY` documents
   - User: `READY` documents in their division only
7. The system must display a horizontal bar chart of document counts grouped by `documentType` — **admin only**. Documents with a null type are grouped as "Tidak Diketahui".
8. The system must display a table of the 5 most recent `READY` documents (Nomor, Perihal, Tanggal, Divisi).
   - Admin: org-wide
   - User: division-scoped
9. Each row in the recent documents table must be clickable and navigate to the document viewer.
10. If a regular user has no `divisionId` set, all sections must display zero values and a message: "Anda belum terdaftar di divisi manapun."
11. If a division has no documents, the chart must render empty axes and the table must display "Belum ada dokumen."
12. All database queries must run in parallel (`Promise.all`) inside a single server action `getDashboardStats()`.

---

## 5. Non-Goals (Out of Scope)

- Date range picker — the trend chart is fixed at 30 days.
- Export or download of statistics.
- Real-time updates or auto-refresh.
- OCR or document content search from the dashboard.
- Per-document analytics (view counts, download counts).

---

## 6. Design Considerations

- Use the existing shadcn/ui `Card` component for stat cards — consistent with the current layout.
- Install `recharts` and add the shadcn `chart` component (`pnpm add recharts && pnpm dlx shadcn@latest add chart`). Use `<ChartContainer>` for consistent chart styling.
- Chart components must be `"use client"` — Recharts requires the browser. Stat cards and the table are server-rendered.
- Admin layout: 4-column stat grid → trend chart → type breakdown → recent docs table.
- User layout: 3-column stat grid → trend chart → recent docs table (no type breakdown).
- Follow existing color tokens (`text-primary`, `bg-accent`, `text-slate-*`) — no new colors.

---

## 7. Technical Considerations

- All data fetching happens in `src/app/(app)/page.tsx` (server component) via a server action in `src/app/(app)/actions.ts` (or a new `src/lib/dashboard.ts`).
- Session is read via `auth()` from next-auth to get `role` and `divisionId`.
- Division-scoped document queries join through the `DocumentDivision` table.
- New components go in `src/components/dashboard/`: `stat-card.tsx`, `trend-chart.tsx`, `type-breakdown-chart.tsx`, `recent-documents-table.tsx`.
- Trend data query: `GROUP BY DATE(createdAt)` for documents where `createdAt >= now() - 30 days` and `status = READY`. Fill missing dates with 0 in application code.
- Type breakdown query: `GROUP BY documentType` where `status = READY`. Map enum values to readable Indonesian labels in application code.

---

## 8. Success Metrics

- The dashboard loads with real data on every page visit — no hardcoded values remain.
- Admins can see org-wide document trends without navigating to another page.
- Regular users see only their division's data — no cross-division information leakage.
- Page load time remains under 2 seconds (queries run in parallel).

---

## 9. Open Questions

- None — all design decisions were resolved during the brainstorming session on 2026-06-09. See [`docs/plans/2026-06-09-dashboard-insights-design.md`](../plans/2026-06-09-dashboard-insights-design.md) for full rationale.
