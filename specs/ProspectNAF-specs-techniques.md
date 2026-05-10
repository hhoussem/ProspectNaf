# ProspectNAF — Spécifications Techniques
**Version** : 1.0
**Date** : Mai 2026
**Statut** : Draft

---

## Table des matières

1. [Stack technique](#1-stack-technique)
2. [Architecture système](#2-architecture-système)
3. [Structure du projet](#3-structure-du-projet)
4. [Base de données](#4-base-de-données)
5. [API Backend](#5-api-backend)
6. [Intégration API Sirene](#6-intégration-api-sirene)
7. [Frontend](#7-frontend)
8. [Authentification](#8-authentification)
9. [Paiement Stripe](#9-paiement-stripe)
10. [Export CSV](#10-export-csv)
11. [Emails transactionnels](#11-emails-transactionnels)
12. [Cache & performance](#12-cache--performance)
13. [Watchlists & jobs (V2)](#13-watchlists--jobs-v2)
14. [Sécurité](#14-sécurité)
15. [Infrastructure & déploiement](#15-infrastructure--déploiement)
16. [Monitoring & observabilité](#16-monitoring--observabilité)
17. [Variables d'environnement](#17-variables-denvironnement)

---

## 1. Stack technique

### 1.1 Choix technologiques

| Couche | Technologie | Justification |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR/SSG, routing intégré, écosystème React mature |
| Styling | Tailwind CSS + shadcn/ui | Rapidité de développement, composants accessibles |
| Backend | Next.js API Routes (Node.js) | Monorepo simple, pas de serveur séparé pour le MVP |
| Base de données | PostgreSQL 15 | Requêtes géographiques, JSON, fiabilité |
| ORM | Prisma | Type-safety, migrations, DX excellente |
| Cache | Redis (Upstash) | Cache API Sirene, sessions, rate limiting |
| Auth | NextAuth.js v5 | Intégration Next.js native, JWT + sessions |
| Paiement | Stripe (Checkout + Billing Portal) | Standard du marché, webhooks fiables |
| Emails | Resend + React Email | API simple, templates React, délivrabilité |
| Déploiement | Vercel (frontend + API) | Zero-config Next.js, edge network |
| Base Sirene locale | PostgreSQL (même instance) | Fallback API, table dédiée |
| Monitoring | Sentry + Vercel Analytics | Erreurs + métriques de performance |
| CI/CD | GitHub Actions | Tests + lint + déploiement automatique |

### 1.2 Dépendances principales

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "typescript": "5.x",
    "prisma": "5.x",
    "@prisma/client": "5.x",
    "next-auth": "5.x",
    "stripe": "14.x",
    "@stripe/stripe-js": "2.x",
    "resend": "3.x",
    "@react-email/components": "0.x",
    "zod": "3.x",
    "tailwindcss": "3.x",
    "redis": "4.x",
    "papaparse": "5.x",
    "date-fns": "3.x",
    "lucide-react": "0.x"
  },
  "devDependencies": {
    "vitest": "1.x",
    "@testing-library/react": "14.x",
    "playwright": "1.x",
    "eslint": "8.x",
    "prettier": "3.x"
  }
}
```

---

## 2. Architecture système

### 2.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel Edge                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Next.js Application                  │   │
│  │  ┌─────────────┐    ┌──────────────────────────┐ │   │
│  │  │  App Router  │    │     API Routes           │ │   │
│  │  │  (Frontend)  │    │  /api/auth, /api/search  │ │   │
│  │  │              │    │  /api/lists, /api/export  │ │   │
│  │  └─────────────┘    └──────────────────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────────┐
│  Upstash Redis  │    │  Neon PostgreSQL      │
│  - Cache API    │    │  - Users, Lists       │
│  - Rate limit   │    │  - Annotations        │
│  - Sessions     │    │  - Sirene fallback    │
└─────────────────┘    └──────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│         API Recherche Entreprises (gouv.fr)  │
│         + Stripe + Resend                    │
└─────────────────────────────────────────────┘
```

### 2.2 Flux de données — Recherche

```
Client → POST /api/search
  → Vérification quota utilisateur (Redis)
  → Validation paramètres (Zod)
  → Lookup cache Redis (clé = hash des paramètres)
    → Cache HIT  → retour immédiat
    → Cache MISS → appel API gouvernementale
                 → transformation réponse
                 → stockage cache 24h
                 → retour client
```

---

## 3. Structure du projet

```
prospectnaf/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/
│   │   ├── search/page.tsx
│   │   ├── lists/
│   │   │   ├── page.tsx          # /lists — Mes listes
│   │   │   └── [id]/page.tsx     # /lists/:id — Vue liste
│   │   └── account/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── search/route.ts
│   │   ├── lists/
│   │   │   ├── route.ts          # GET, POST
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET, PUT, DELETE
│   │   │       └── companies/route.ts
│   │   ├── export/route.ts
│   │   ├── billing/
│   │   │   ├── checkout/route.ts
│   │   │   └── webhook/route.ts
│   │   └── naf/autocomplete/route.ts
│   └── layout.tsx
├── components/
│   ├── search/
│   │   ├── SearchForm.tsx
│   │   ├── NafAutocomplete.tsx
│   │   ├── LocationAutocomplete.tsx
│   │   └── EffectifFilter.tsx
│   ├── results/
│   │   ├── ResultsHeader.tsx
│   │   ├── CompanyCard.tsx
│   │   └── Pagination.tsx
│   ├── lists/
│   │   ├── ListsTable.tsx
│   │   ├── SaveListModal.tsx
│   │   └── AnnotationPanel.tsx
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── db.ts                     # Prisma client singleton
│   ├── redis.ts                  # Upstash Redis client
│   ├── sirene.ts                 # Wrapper API gouvernementale
│   ├── auth.ts                   # NextAuth config
│   ├── stripe.ts                 # Stripe client
│   ├── email.ts                  # Resend client
│   ├── quota.ts                  # Gestion des limites par plan
│   └── validators/
│       ├── search.ts             # Zod schemas recherche
│       └── list.ts               # Zod schemas listes
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── emails/                       # React Email templates
│   ├── ConfirmEmail.tsx
│   ├── ResetPassword.tsx
│   └── TrialReminder.tsx
└── types/
    ├── company.ts
    ├── list.ts
    └── plan.ts
```

---

## 4. Base de données

### 4.1 Schéma Prisma

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Plan {
  FREE
  SOLO
  PRO
}

enum AnnotationStatus {
  UNTREATED
  TO_CONTACT
  IN_PROGRESS
  INTERESTING
  NOT_RELEVANT
  ARCHIVED
}

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  emailVerified     DateTime?
  passwordHash      String
  firstName         String?
  plan              Plan      @default(FREE)
  stripeCustomerId  String?   @unique
  stripeSubId       String?   @unique
  trialEndsAt       DateTime?
  searchesToday     Int       @default(0)
  searchesResetAt   DateTime  @default(now())
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  lists             List[]
  sessions          Session[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model List {
  id          String    @id @default(cuid())
  userId      String
  name        String    @db.VarChar(80)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  companies   ListCompany[]

  @@index([userId])
}

model ListCompany {
  id          String           @id @default(cuid())
  listId      String
  siren       String           @db.Char(9)
  addedAt     DateTime         @default(now())
  status      AnnotationStatus @default(UNTREATED)
  note        String?          @db.VarChar(500)
  isPriority  Boolean          @default(false)

  list        List             @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@unique([listId, siren])
  @@index([listId])
  @@index([siren])
}

// Table de cache Sirene local (fallback)
model SireneCompany {
  siren           String   @id @db.Char(9)
  siretSiege      String   @db.Char(14)
  denomination    String
  adresseNumero   String?
  adresseVoie     String?
  codePostal      String?  @db.Char(5)
  ville           String?
  codeDept        String?  @db.Char(3)
  codeRegion      String?  @db.Char(2)
  codeNaf         String   @db.Char(6)
  libelleNaf      String
  trancheEffectif String?  @db.Char(2)
  dateCreation    DateTime?
  formeJuridique  String?
  isActive        Boolean  @default(true)
  updatedAt       DateTime @updatedAt

  @@index([codeNaf])
  @@index([codeDept])
  @@index([codeRegion])
  @@index([isActive])
}
```

### 4.2 Index et performances

- Index composé `(codeNaf, codeDept, isActive)` sur `SireneCompany` pour les requêtes de recherche fréquentes
- Index `(userId, createdAt)` sur `List` pour le tri par date
- Index `(listId, status)` sur `ListCompany` pour le filtrage par statut d'annotation
