import { FileText, TrendingUp, Building2, Users, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { auth } from '@/auth'
import { getDashboardStats } from '@/lib/dashboard'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { TypeBreakdownChart } from '@/components/dashboard/type-breakdown-chart'
import { RecentDocumentsTable } from '@/components/dashboard/recent-documents-table'

export default async function BerandaPage() {
  const session = await auth()
  const role = session!.user.role
  const userId = session!.user.id
  const divisionId = session!.user.divisionId ?? null

  const stats = await getDashboardStats(role, userId, divisionId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Beranda</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan aktivitas dokumen Anda</p>
      </div>

      {stats.role === 'ADMIN' ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Dokumen"
              value={stats.totalDocs}
              icon={FileText}
              change={stats.docsThisMonth - stats.docsLastMonth}
              color="blue"
            />
            <StatCard
              label="Dokumen Bulan Ini"
              value={stats.docsThisMonth}
              icon={TrendingUp}
              change={stats.docsThisMonth - stats.docsLastMonth}
              color="emerald"
            />
            <StatCard
              label="Divisi Aktif"
              value={stats.activeDivisions}
              icon={Building2}
              suffix={`dari ${stats.totalDivisions} divisi`}
              color="violet"
            />
            <StatCard
              label="Pengguna Aktif"
              value={stats.activeUsers}
              icon={Users}
              suffix={`dari ${stats.totalUsers} pengguna`}
              color="amber"
            />
          </div>

          <TrendChart data={stats.trendData} />
          <TypeBreakdownChart data={stats.typeBreakdown} />
          <RecentDocumentsTable documents={stats.recentDocs} />
        </>
      ) : stats.noDivision ? (
        <Card className="p-8 text-center text-sm text-slate-500">
          Anda belum terdaftar di divisi manapun.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Dokumen Divisi"
              value={stats.divisionTotalDocs}
              icon={FileText}
              change={stats.divisionMonthDocs - stats.divisionLastMonthDocs}
              color="blue"
            />
            <StatCard
              label="Dokumen Bulan Ini"
              value={stats.divisionMonthDocs}
              icon={TrendingUp}
              change={stats.divisionMonthDocs - stats.divisionLastMonthDocs}
              color="emerald"
            />
            <StatCard
              label="Pencarian Bulan Ini"
              value={stats.mySearchCount}
              icon={Search}
              change={stats.mySearchCount - stats.mySearchLastMonth}
              color="violet"
            />
          </div>

          <TrendChart data={stats.trendData} />
          <RecentDocumentsTable documents={stats.recentDocs} />
        </>
      )}
    </div>
  )
}
