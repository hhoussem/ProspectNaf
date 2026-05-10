import * as React from 'react'

interface Props {
  resetUrl: string
}

export default function ResetPassword({ resetUrl }: Props) {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', padding: '32px 16px', color: '#111' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Réinitialisation de mot de passe</h1>
      <p style={{ color: '#555', lineHeight: 1.6 }}>
        Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous — ce lien est valable 1 heure.
      </p>
      <a
        href={resetUrl}
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
        Réinitialiser mon mot de passe
      </a>
      <p style={{ marginTop: 24, fontSize: 13, color: '#777' }}>
        Si tu n&apos;as pas fait cette demande, ignore cet email. Ton mot de passe reste inchangé.
      </p>
      <p style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
        Ou copie ce lien dans ton navigateur : {resetUrl}
      </p>
    </div>
  )
}
