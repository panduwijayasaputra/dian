# Dashboard Insights Design

**Date:** 2026-06-09

## Goal

Replace all hardcoded mock data on the Beranda (home) dashboard with real database-driven stats, a trend chart, a document type breakdown, and a recent documents table.

---

## Role-Based Views

### Admin

Sees org-wide data — no division filter.

| Section | Content |
|---|---|
| Stat cards (4) | Total docs, docs this month, active divisions, active users |
| Trend chart | Daily uploads (last 30 days, all documents) |
| Type breakdown | Horizontal bar chart — count per document type |
| Recent docs table | 5 most recent READY documents |

### Regular User

Sees only documents from their own division (via `DocumentDivision` join). If `divisionId` is null, all sections show zero with a note: "Anda belum terdaftar di divisi manapun."

| Section | Content |
|---|---|
| Stat cards (3) | Total docs in division, docs this month in division, personal search count this month |
| Trend chart | Daily uploads (last 30 days, division-filtered) |
| Recent docs table | 5 most recent READY docs in their division |

No type breakdown for regular users.

---

## Data Queries

All queries run in a single Server Action `getDashboardStats()` called from the page.

### Admin Queries

```
totalDocs         → COUNT(Document) WHERE status = READY
docsThisMonth     → COUNT(Document) WHERE status = READY AND createdAt >= startOfMonth
docsLastMonth     → COUNT(Document) WHERE status = READY AND createdAt in lastMonth
activeDivisions   → COUNT(Division) WHERE documentDivisions.some(doc.status = READY)
totalDivisions    → COUNT(Division)
activeUsers       → COUNT(User) WHERE isActive = true
totalUsers        → COUNT(User)
trendData         → GROUP BY DATE(createdAt) last 30 days, status = READY
typeBreakdown     → GROUP BY documentType, status = READY
recentDocs        → 5 most recent READY docs with divisions
```

### User Queries (division-scoped)

```
divisionTotalDocs    → COUNT via DocumentDivision JOIN where divisionId = user.divisionId AND status = READY
divisionMonthDocs    → same + createdAt >= startOfMonth
divisionLastMonthDocs → same + createdAt in lastMonth
mySearchCount        → COUNT(ActivityLog) WHERE userId = me AND action = 'SEARCH' AND createdAt >= startOfMonth
mySearchLastMonth    → same + createdAt in lastMonth
trendData            → GROUP BY DATE, division-scoped
recentDocs           → 5 most recent READY docs in division
```

---

## Components

```
src/app/(app)/page.tsx                    ← server component, fetches data, renders layout
src/app/(app)/actions.ts (or new file)    ← getDashboardStats() server action
src/components/dashboard/
  stat-card.tsx                           ← reusable card (label, value, change)
  trend-chart.tsx                         ← recharts BarChart, daily uploads
  type-breakdown-chart.tsx                ← recharts horizontal BarChart, admin only
  recent-documents-table.tsx              ← table, clickable rows → document viewer
```

---

## Chart Library

Install Recharts via shadcn chart component:

```bash
pnpm add recharts
pnpm dlx shadcn@latest add chart
```

Use shadcn `<ChartContainer>` wrapper for consistent styling.

---

## Stat Card Change Indicator

Each stat card shows a change vs. last month:

- `+N dari bulan lalu` (positive) — green text
- `−N dari bulan lalu` (negative) — red text  
- `sama seperti bulan lalu` (zero) — slate text

---

## Data Flow

```
page.tsx (server component)
  └── auth() → get session.user (role, divisionId)
  └── getDashboardStats(role, divisionId) → returns typed object
        └── Prisma queries (all in parallel via Promise.all)
  └── renders layout with real data passed as props to client chart components
```

Chart components are `"use client"` (Recharts requires browser). Stat cards and table are server-renderable.

---

## Empty States

- Division with no documents → charts show empty, table shows "Belum ada dokumen."
- User with no divisionId → all sections show "Anda belum terdaftar di divisi manapun."
- documentType is null → grouped under "Tidak Diketahui"

---

## Out of Scope

- Date range picker for the chart (default 30 days only)
- Export / download stats
- Real-time updates (no polling)
