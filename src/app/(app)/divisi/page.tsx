import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getDivisions } from './actions'
import { DivisiClient } from './divisi-client'

export default async function DivisiPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/')

  const divisions = await getDivisions()
  return <DivisiClient initialDivisions={divisions} />
}
