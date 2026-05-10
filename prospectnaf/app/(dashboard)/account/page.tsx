import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AccountClient from '@/components/account/AccountClient'

export default async function AccountPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return <AccountClient user={session.user} />
}
