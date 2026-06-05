import { getDivisions } from './actions'
import { DivisionsClient } from './divisions-client'

export default async function DivisionsPage() {
  const divisions = await getDivisions()
  return <DivisionsClient initialDivisions={divisions} />
}
