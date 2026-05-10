import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SearchClient from '@/components/search/SearchClient'

export default async function SearchPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <SearchClient
      plan={session.user.plan}
      searchesToday={session.user.searchesToday}
    />
  )
}
