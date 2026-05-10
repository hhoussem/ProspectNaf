import * as React from 'react'

interface Props {
  firstName?: string
  daysLeft: number
  upgradeUrl: string
}

export default function TrialReminder({ firstName, daysLeft, upgradeUrl }: Props) {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto', padding: '32px 16px', color: '#111' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Ton essai se termine dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
      </h1>
      {firstName && <p style={{ color: '#555', marginBottom: 16 }}>Bonjour {firstName},</p>}
      <p style={{ color: '#555', lineHeight: 1.6 }}>
        Ton essai gratuit du plan Solo expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}.
        Pour continuer à profiter des recherches illimitées, des listes et de l&apos;export CSV, ajoute un moyen de paiement.
      </p>
      <a
        href={upgradeUrl}
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
        Continuer avec Solo
      </a>
      <p style={{ marginTop: 24, fontSize: 13, color: '#777' }}>
        Si tu ne souhaites pas continuer, aucune action n&apos;est nécessaire — tu passeras automatiquement au plan gratuit.
      </p>
    </div>
  )
}
