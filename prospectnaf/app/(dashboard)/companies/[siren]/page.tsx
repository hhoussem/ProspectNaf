import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CompanyDetailClient from '@/components/companies/CompanyDetailClient'

interface Props {
  params: { siren: string }
}

export default async function CompanyDetailPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect('/login')

  return <CompanyDetailClient siren={params.siren} plan={session.user.plan} />
}
