import { Resend } from 'resend'
import type { ReactElement } from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'ProspectNAF <noreply@prospectnaf.fr>'

export async function sendEmail({
  to,
  subject,
  template,
}: {
  to: string
  subject: string
  template: ReactElement
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject,
    react: template,
  })
}
