import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getUsers } from './actions'
import { getDivisions } from '@/app/(app)/divisi/actions'
import { PenggunaClient } from './pengguna-client'

export default async function PenggunaPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/')

  const [users, divisions] = await Promise.all([getUsers(), getDivisions()])
  const simpleDivisions = divisions.map((d) => ({ id: d.id, name: d.name }))

  return <PenggunaClient initialUsers={users} divisions={simpleDivisions} />
}
