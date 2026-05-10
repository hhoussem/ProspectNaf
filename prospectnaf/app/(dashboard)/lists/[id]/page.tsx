import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ListDetailClient from '@/components/lists/ListDetailClient'

interface Props {
  params: { id: string }
}

export default async function ListDetailPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect('/login')

  return <ListDetailClient listId={params.id} plan={session.user.plan} />
}
