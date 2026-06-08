import { FileText, TrendingUp, Building2, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'

const statCards = [
  { label: 'Total Dokumen', value: '1.248', icon: FileText, change: '+12 bulan ini' },
  { label: 'Dokumen Bulan Ini', value: '47', icon: TrendingUp, change: '+8 dari bulan lalu' },
  { label: 'Divisi Aktif', value: '6', icon: Building2, change: 'dari 6 divisi' },
  { label: 'Pengguna Aktif', value: '24', icon: Users, change: 'dari 28 pengguna' },
]

const dokumenTerbaru = [
  { no: 'SK/2026/001', perihal: 'Surat Keputusan Pengangkatan Jabatan', tanggal: '5 Jun 2026', divisi: 'SDM' },
  { no: 'ND/2026/047', perihal: 'Nota Dinas Rapat Koordinasi Bulanan', tanggal: '4 Jun 2026', divisi: 'Umum' },
  { no: 'SP/2026/023', perihal: 'Surat Permohonan Pengadaan Barang', tanggal: '3 Jun 2026', divisi: 'Keuangan' },
  { no: 'SE/2026/009', perihal: 'Surat Edaran Kebijakan Cuti Tahunan', tanggal: '2 Jun 2026', divisi: 'SDM' },
  { no: 'BA/2026/015', perihal: 'Berita Acara Serah Terima Aset', tanggal: '1 Jun 2026', divisi: 'Aset' },
]

export default function BerandaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Beranda</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan aktivitas dokumen Anda</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, change }) => (
          <Card key={label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{change}</p>
              </div>
              <div className="rounded-lg bg-accent p-2">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Dokumen Terbaru</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4">Nomor</th>
                <th className="pb-3 pr-4">Perihal</th>
                <th className="pb-3 pr-4">Tanggal</th>
                <th className="pb-3">Divisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dokumenTerbaru.map((doc) => (
                <tr key={doc.no} className="hover:bg-slate-50">
                  <td className="py-3 pr-4 font-mono text-xs text-slate-600">{doc.no}</td>
                  <td className="py-3 pr-4 text-slate-700">{doc.perihal}</td>
                  <td className="py-3 pr-4 text-slate-500">{doc.tanggal}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary">
                      {doc.divisi}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
