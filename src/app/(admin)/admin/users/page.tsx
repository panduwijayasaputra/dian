import { getUsers } from './actions'
import { getDivisions } from '../divisions/actions'
import { UsersClient } from './users-client'

export default async function UsersPage() {
  const [users, divisions] = await Promise.all([getUsers(), getDivisions()])
  const simpleDivisions = divisions.map((d) => ({ id: d.id, name: d.name }))
  return <UsersClient initialUsers={users} divisions={simpleDivisions} />
}
