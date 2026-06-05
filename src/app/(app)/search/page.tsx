import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { SearchView } from '@/components/search/search-view'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const params = await searchParams
  const debug = params.debug === '1'

  return (
    <div>
      <SearchView debug={debug} />
    </div>
  )
}
