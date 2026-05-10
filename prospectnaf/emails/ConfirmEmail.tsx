import * as React from 'react'

interface Props {
  firstName?: string
  loginUrl: string
}

export default function ConfirmEmail({ firstName, loginUrl }: Props) {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', padding: '32px 16px', color: '#111' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Bienvenue sur ProspectNAF 👋</h1>
      {firstName && <p style={{ color: '#555', marginBottom: 16 }}>Bonjour {firstName},</p>}
      <p style={{ color: '#555', lineHeight: 1.6 }}>
        Ton compte a bien été créé. Tu peux maintenant te connecter et commencer à prospecter.
      </p>
      <a
        href={loginUrl}
        style={{
          display: 'inline-block',
          marginTop: 24,
          padding: '12px 24px',
          background: '#2563eb',
          color: '#fff',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Se connecter
      </a>
      <p style={{ marginTop: 32, fontSize: 12, color: '#999' }}>
        Si tu n&apos;es pas à l&apos;origine de cette inscription, ignore cet email.
      </p>
    </div>
  )
}
