import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ListsClient from '@/components/lists/ListsClient'

export default async function ListsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return <ListsClient plan={session.user.plan} />
}
