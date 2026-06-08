# Tasks: Dashboard Insights

Based on: `docs/prd/prd-dashboard-insights.md`

## Relevant Files

- `src/app/(app)/page.tsx` - Main dashboard page — replace mock data with real data, render role-based layout.
- `src/lib/dashboard.ts` - Server-side data fetching — `getDashboardStats()` with all Prisma queries.
- `src/components/dashboard/stat-card.tsx` - Reusable stat card with label, value, and change indicator.
- `src/components/dashboard/trend-chart.tsx` - Client component — bar chart of daily uploads (last 30 days).
- `src/components/dashboard/type-breakdown-chart.tsx` - Client component — horizontal bar chart by document type (admin only).
- `src/components/dashboard/recent-documents-table.tsx` - Clickable recent documents table.
- `src/components/ui/chart.tsx` - shadcn chart component (to be added via CLI).

### Notes

- Install recharts before implementing chart components: `pnpm add recharts && pnpm dlx shadcn@latest add chart`
- Chart components must be `"use client"` — Recharts requires the browser.
- No test suite is configured in this project — manual verification via the running dev server.

---

## Tasks

- [ ] 1.0 Install chart library and scaffold dashboard component files
  - [x] 1.1 Install Recharts and add shadcn chart component
    - Run `pnpm add recharts`
    - Run `pnpm dlx shadcn@latest add chart` to generate `src/components/ui/chart.tsx`
    - Verify both commands complete without errors
  - [x] 1.2 Create empty component files in `src/components/dashboard/`
    - Create `src/components/dashboard/stat-card.tsx` with a placeholder export
    - Create `src/components/dashboard/trend-chart.tsx` with `"use client"` and a placeholder export
    - Create `src/components/dashboard/type-breakdown-chart.tsx` with `"use client"` and a placeholder export
    - Create `src/components/dashboard/recent-documents-table.tsx` with a placeholder export

- [ ] 2.0 Build the `getDashboardStats()` server function with all Prisma queries
  - [x] 2.1 Create `src/lib/dashboard.ts` and define return types
    - Create the file with `import 'server-only'` at the top
    - Define TypeScript types: `AdminStats`, `UserStats`, `TrendDataPoint` (`{ date: string; count: number }`), `TypeBreakdownItem` (`{ type: string; label: string; count: number }`), `RecentDocument` (`{ id, documentNumber, subject, documentDate, divisions[] }`)
    - Export a union type `DashboardStats = AdminDashboardStats | UserDashboardStats` with a `role` discriminant field
  - [x] 2.2 Implement admin queries
    - Use `Promise.all` to run all queries in parallel:
      - `totalDocs`: `prisma.document.count({ where: { status: 'READY' } })`
      - `docsThisMonth`: count where `status = READY` and `createdAt >= startOfCurrentMonth`
      - `docsLastMonth`: count where `status = READY` and `createdAt` between start and end of last month
      - `activeDivisions`: count distinct divisions that have at least one `READY` document via `DocumentDivision` join
      - `totalDivisions`: `prisma.division.count()`
      - `activeUsers`: `prisma.user.count({ where: { isActive: true } })`
      - `totalUsers`: `prisma.user.count()`
      - `trendData`: raw query grouping `DATE(createdAt)` for `READY` docs in the last 30 days — fill missing dates with `0` in JS
      - `typeBreakdown`: `prisma.document.groupBy({ by: ['documentType'], where: { status: 'READY' }, _count: true })` — map enum to Indonesian label, group nulls as "Tidak Diketahui"
      - `recentDocs`: `prisma.document.findMany({ where: { status: 'READY' }, orderBy: { createdAt: 'desc' }, take: 5, include: { divisions: { include: { division: true } } } })`
  - [x] 2.3 Implement user queries (division-scoped)
    - Accept `divisionId: string | null` as parameter
    - If `divisionId` is null, return zeroed stats immediately with `noDivision: true` flag
    - Use `Promise.all` for:
      - `divisionTotalDocs`: count `READY` docs where `divisions.some({ divisionId })`
      - `divisionMonthDocs`: same + `createdAt >= startOfCurrentMonth`
      - `divisionLastMonthDocs`: same + `createdAt` in last month range
      - `mySearchCount`: `prisma.activityLog.count({ where: { userId, action: 'SEARCH', createdAt >= startOfCurrentMonth } })`
      - `mySearchLastMonth`: same for last month
      - `trendData`: same as admin but filtered by `divisions.some({ divisionId })`
      - `recentDocs`: 5 most recent `READY` docs filtered by `divisions.some({ divisionId })`, include division names
  - [x] 2.4 Export a single `getDashboardStats(role, userId, divisionId)` function
    - Branch on `role === 'ADMIN'` to call admin or user query sets
    - Return typed `DashboardStats` object

- [ ] 3.0 Build reusable dashboard UI components (stat card, table)
  - [x] 3.1 Implement `StatCard` component
    - Props: `label: string`, `value: number | string`, `icon: LucideIcon`, `change: number` (delta vs last month), `suffix?: string` (e.g. "dari 6 divisi")
    - Render the card using the existing shadcn `Card` with `p-5`
    - Show icon in `bg-accent` rounded box (same as current layout)
    - Change indicator logic:
      - `change > 0` → green text, `+N dari bulan lalu`
      - `change < 0` → red text, `−N dari bulan lalu`
      - `change === 0` → slate text, `sama seperti bulan lalu`
    - For cards with a fixed suffix (divisions, users), show `suffix` instead of change text
  - [x] 3.2 Implement `RecentDocumentsTable` component
    - Props: `documents: RecentDocument[]`
    - Render the same table structure as the current mock table (Nomor, Perihal, Tanggal, Divisi columns)
    - Each `<tr>` wraps a `next/link` to `/documents?id={doc.id}` (or the document viewer route — check existing routing)
    - If `documents` is empty, render a single row with colspan=4 and text "Belum ada dokumen."
    - Format `documentDate` using `date-fns` `format(date, 'd MMM yyyy', { locale: id })`
    - Show first division name as a badge; if multiple, show `+N lagi`

- [ ] 4.0 Build chart components (trend chart, type breakdown)
  - [x] 4.1 Implement `TrendChart` component
    - `"use client"` directive at top
    - Props: `data: TrendDataPoint[]` (`{ date: string; count: number }[]`)
    - Use shadcn `<ChartContainer>` with a `config` object (`{ count: { label: 'Dokumen', color: 'var(--color-primary)' } }`)
    - Render a Recharts `<BarChart>` inside with:
      - `<XAxis dataKey="date" />` — show abbreviated date labels (e.g. "9 Jun")
      - `<YAxis allowDecimals={false} />`
      - `<ChartTooltip content={<ChartTooltipContent />} />`
      - `<Bar dataKey="count" fill="var(--color-primary)" radius={[4,4,0,0]} />`
    - Wrap in a `Card` with title "Tren Unggahan (30 Hari Terakhir)"
    - If all counts are 0, show a centered "Belum ada data." message instead of the chart
  - [x] 4.2 Implement `TypeBreakdownChart` component (admin only)
    - `"use client"` directive at top
    - Props: `data: TypeBreakdownItem[]` (`{ type: string; label: string; count: number }[]`)
    - Use shadcn `<ChartContainer>` with config mapping each type to a color
    - Render a Recharts `<BarChart layout="vertical">` with:
      - `<XAxis type="number" allowDecimals={false} />`
      - `<YAxis type="category" dataKey="label" width={120} />`
      - `<ChartTooltip content={<ChartTooltipContent />} />`
      - `<Bar dataKey="count" fill="var(--color-primary)" radius={[0,4,4,0]} />`
    - Wrap in a `Card` with title "Distribusi Jenis Dokumen"
    - If `data` is empty, show "Belum ada data."
    - Indonesian label map for `DocumentType` enum:
      - `INCOMING_LETTER` → "Surat Masuk", `OUTGOING_LETTER` → "Surat Keluar", `DISPOSITION` → "Disposisi", `MEMO` → "Memo", `REPORT` → "Laporan", `DECREE` → "SK", `NOTA_DINAS` → "Nota Dinas", `SPT` → "SPT", `OTHER` → "Lainnya", `null` → "Tidak Diketahui"

- [ ] 5.0 Wire everything together in `page.tsx` and verify role-based rendering
  - [x] 5.1 Update `page.tsx` to fetch real data
    - Add `import { auth } from '@/auth'` and call `const session = await auth()`
    - Extract `role`, `id` (userId), and `divisionId` from `session.user`
    - Call `getDashboardStats(role, userId, divisionId)` and await the result
    - Remove all hardcoded `statCards` and `dokumenTerbaru` arrays
  - [x] 5.2 Render admin layout
    - When `stats.role === 'ADMIN'`, render:
      1. 4-column stat grid using `<StatCard>` for total docs, month docs, active divisions, active users
      2. `<TrendChart data={stats.trendData} />`
      3. `<TypeBreakdownChart data={stats.typeBreakdown} />`
      4. `<RecentDocumentsTable documents={stats.recentDocs} />`
  - [x] 5.3 Render user layout
    - When `stats.role === 'USER'`, check `stats.noDivision`:
      - If true: show a single `Card` with the message "Anda belum terdaftar di divisi manapun." and no other sections
      - If false: render:
        1. 3-column stat grid: total division docs, month division docs, personal search count
        2. `<TrendChart data={stats.trendData} />`
        3. `<RecentDocumentsTable documents={stats.recentDocs} />`
  - [ ] 5.4 Manual verification
    - Start dev server (`pnpm dev`) and log in as admin — confirm all 4 stat cards show real numbers, trend chart renders, type breakdown renders, recent docs table is populated and rows are clickable
    - Log in as a regular user with a division — confirm 3 stat cards show division-scoped data, trend chart and table are division-filtered
    - Log in as a regular user with no division — confirm "Anda belum terdaftar di divisi manapun." message appears
    - Confirm no hardcoded values remain anywhere on the page
