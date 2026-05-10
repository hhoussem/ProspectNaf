import * as React from 'react'

interface Props {
  email: string
}

export default function AccountDeleted({ email }: Props) {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', padding: '32px 16px', color: '#111' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Compte supprimé</h1>
      <p style={{ color: '#555', lineHeight: 1.6 }}>
        Le compte associé à <strong>{email}</strong> a bien été supprimé. Toutes tes données ont été effacées.
      </p>
      <p style={{ color: '#555', lineHeight: 1.6, marginTop: 16 }}>
        Si tu as un abonnement actif, il a été résilié automatiquement.
      </p>
      <p style={{ marginTop: 32, fontSize: 12, color: '#999' }}>
        Si tu n&apos;es pas à l&apos;origine de cette action, contacte-nous immédiatement.
      </p>
    </div>
  )
}
