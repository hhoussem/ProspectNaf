import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar plan={session.user.plan} searchesToday={session.user.searchesToday} />
      <main>{children}</main>
    </div>
  )
}
