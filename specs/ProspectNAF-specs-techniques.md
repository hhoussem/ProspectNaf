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

---

## 5. API Backend

### 5.1 Endpoints

#### `POST /api/search`

Recherche d'entreprises via l'API gouvernementale.

**Request body (Zod schema) :**
```typescript
const SearchSchema = z.object({
  nafCodes:    z.array(z.string().regex(/^\d{4}[A-Z]$/)).min(1).max(5),
  locations:   z.array(z.string()).max(3).optional(),
  effectifs:   z.array(z.string()).optional(),
  dateFrom:    z.string().optional(),   // ISO date
  dateTo:      z.string().optional(),
  statut:      z.enum(['ACTIF', 'FERME', 'TOUS']).default('ACTIF'),
  formes:      z.array(z.string()).optional(),
  page:        z.number().int().min(1).default(1),
  perPage:     z.number().int().min(1).max(100).default(25),
})
```

**Response :**
```typescript
{
  total: number,
  page: number,
  perPage: number,
  results: Company[],
  source: 'api' | 'cache' | 'local'
}
```

**Logique :**
1. Authentification requise
2. Vérification quota (Redis) — retourne 429 si dépassé
3. Validation Zod — retourne 400 si invalide
4. Lookup cache Redis (TTL 24h)
5. Si cache miss : appel API gouvernementale → transformation → mise en cache
6. Incrémentation compteur recherches (Redis)
7. Filtrage des résultats selon le plan (20 max pour FREE)

---

#### `GET /api/lists`

Retourne les listes de l'utilisateur connecté.

**Response :**
```typescript
{
  lists: {
    id: string,
    name: string,
    companyCount: number,
    createdAt: string,
    updatedAt: string
  }[]
}
```

---

#### `POST /api/lists`

Crée une nouvelle liste.

**Request body :**
```typescript
{ name: string, siren?: string[] }
```

**Logique :**
- Vérification limite de listes selon le plan (1 FREE, 10 SOLO, illimité PRO)
- Vérification limite d'entreprises par liste
- Déduplication des SIREN

---

#### `GET /api/lists/:id`

Retourne le détail d'une liste avec ses entreprises et annotations.

---

#### `POST /api/lists/:id/companies`

Ajoute des entreprises à une liste existante.

**Request body :**
```typescript
{ sirens: string[] }
```

**Response :**
```typescript
{ added: number, alreadyPresent: number, limitReached: boolean }
```

---

#### `PATCH /api/lists/:id/companies/:siren`

Met à jour l'annotation d'une entreprise dans une liste.

**Request body :**
```typescript
{
  status?: AnnotationStatus,
  note?: string,
  isPriority?: boolean
}
```

---

#### `GET /api/export`

Génère et retourne un fichier CSV.

**Query params :** `listId` ou `sirens[]`

**Headers de réponse :**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="prospectnaf_[name]_[date].csv"
```

---

#### `GET /api/naf/autocomplete`

Autocomplétion des codes NAF.

**Query params :** `q` (min 2 caractères)

**Response :**
```typescript
{ results: { code: string, label: string }[] }  // max 10
```

Source : fichier JSON statique des codes NAF chargé en mémoire au démarrage.

---

### 5.2 Gestion des erreurs

Toutes les API routes retournent un format d'erreur uniforme :

```typescript
{
  error: {
    code: string,      // ex: 'QUOTA_EXCEEDED', 'VALIDATION_ERROR'
    message: string,   // message lisible
    details?: unknown  // erreurs Zod, etc.
  }
}
```

| Code HTTP | Code erreur | Situation |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Paramètres invalides |
| 401 | `UNAUTHORIZED` | Non authentifié |
| 403 | `FORBIDDEN` | Accès refusé (plan insuffisant) |
| 429 | `QUOTA_EXCEEDED` | Limite de recherches atteinte |
| 503 | `API_UNAVAILABLE` | API gouvernementale indisponible |
| 500 | `INTERNAL_ERROR` | Erreur serveur inattendue |

---

## 6. Intégration API Sirene

### 6.1 API Recherche d'Entreprises (api.gouv.fr)

**Base URL :** `https://recherche-entreprises.api.gouv.fr`

**Endpoint principal :**
```
GET /search?q=&activite_principale=&departement=&tranche_effectif_salarie=&page=&per_page=
```

**Mapping des paramètres ProspectNAF → API gouvernementale :**

| Paramètre ProspectNAF | Paramètre API | Notes |
|---|---|---|
| `nafCodes[]` | `activite_principale` | Valeurs séparées par virgule |
| `locations[]` (département) | `departement` | Code département |
| `locations[]` (commune) | `commune` | Code INSEE commune |
| `effectifs[]` | `tranche_effectif_salarie` | Codes Sirene séparés par virgule |
| `dateFrom` | `date_creation_min` | Format YYYY-MM-DD |
| `dateTo` | `date_creation_max` | Format YYYY-MM-DD |
| `statut=ACTIF` | `etat_administratif=A` | A=Actif, F=Fermé |
| `page` | `page` | |
| `perPage` | `per_page` | Max 25 par l'API |

### 6.2 Transformation de la réponse

```typescript
// lib/sirene.ts

interface ApiCompany {
  siren: string
  nom_complet: string
  siege: {
    siret: string
    numero_voie?: string
    type_voie?: string
    libelle_voie?: string
    code_postal?: string
    libelle_commune?: string
    departement?: string
    region?: string
    code_commune?: string
  }
  activite_principale: string
  libelle_activite_principale: string
  tranche_effectif_salarie?: string
  date_creation?: string
  categorie_juridique?: string
  etat_administratif: 'A' | 'F'
}

function transformCompany(raw: ApiCompany): Company {
  return {
    siren: raw.siren,
    siretSiege: raw.siege.siret,
    denomination: raw.nom_complet,
    adresseNumero: raw.siege.numero_voie,
    adresseVoie: [raw.siege.type_voie, raw.siege.libelle_voie].filter(Boolean).join(' '),
    codePostal: raw.siege.code_postal,
    ville: raw.siege.libelle_commune,
    departement: raw.siege.departement,
    region: raw.siege.region,
    codeNaf: raw.activite_principale,
    libelleNaf: raw.libelle_activite_principale,
    trancheEffectif: raw.tranche_effectif_salarie ?? null,
    libelleEffectif: EFFECTIF_LABELS[raw.tranche_effectif_salarie ?? ''] ?? 'Non renseigné',
    dateCreation: raw.date_creation ?? null,
    formeJuridique: FORME_JURIDIQUE_LABELS[raw.categorie_juridique ?? ''] ?? null,
    isActive: raw.etat_administratif === 'A',
  }
}
```

### 6.3 Stratégie de fallback

```typescript
async function searchCompanies(params: SearchParams): Promise<SearchResult> {
  try {
    const result = await callGouvernementAPI(params)
    return { ...result, source: 'api' }
  } catch (error) {
    if (isApiUnavailable(error)) {
      // Fallback sur la base Sirene locale
      const result = await searchLocalSirene(params)
      return { ...result, source: 'local' }
    }
    throw error
  }
}
```

### 6.4 Mise à jour de la base Sirene locale

- Script `scripts/update-sirene.ts` exécuté mensuellement via GitHub Actions
- Téléchargement du fichier CSV Sirene depuis `files.data.gouv.fr`
- Import en base via `COPY` PostgreSQL (bulk insert)
- Durée estimée : 15-30 minutes pour ~12M d'établissements
- Swap atomique : import dans une table temporaire, puis renommage

---

## 7. Frontend

### 7.1 Routing (App Router)

| Route | Composant | Accès |
|---|---|---|
| `/` | Landing page | Public |
| `/login` | LoginPage | Public (redirect si connecté) |
| `/register` | RegisterPage | Public (redirect si connecté) |
| `/forgot-password` | ForgotPasswordPage | Public |
| `/search` | SearchPage | Authentifié |
| `/lists` | ListsPage | Authentifié |
| `/lists/[id]` | ListDetailPage | Authentifié + propriétaire |
| `/account` | AccountPage | Authentifié |
| `/data` | DataPage | Public |

### 7.2 Gestion de l'état

- **État serveur** : React Server Components pour les données initiales
- **État client** : `useState` / `useReducer` pour les interactions UI
- **Formulaires** : `react-hook-form` + validation Zod côté client
- **Requêtes** : `fetch` natif avec SWR pour le revalidation automatique
- **Pas de Redux** : l'état global est minimal (utilisateur connecté, plan)

### 7.3 Composant SearchForm

```typescript
// Flux de données du formulaire de recherche
interface SearchFormState {
  nafCodes: NafCode[]        // max 5
  locations: Location[]      // max 3
  effectifs: string[]
  dateFrom?: string
  dateTo?: string
  statut: 'ACTIF' | 'FERME' | 'TOUS'
  formes: string[]
  showAdvanced: boolean
}
```

### 7.4 Autocomplétion NAF

- Fichier `public/naf-codes.json` : liste complète des ~700 codes NAF avec libellés et synonymes
- Chargé une fois côté client, filtrage en mémoire (pas d'appel API pour l'autocomplétion)
- Fallback : `GET /api/naf/autocomplete?q=` si le fichier n'est pas encore chargé
- Debounce 150ms sur la saisie

### 7.5 Gestion des quotas côté client

- Le plan et les compteurs sont inclus dans la session NextAuth
- Bandeau d'avertissement affiché si `searchesToday >= planLimit * 0.8`
- Modal d'upgrade déclenché côté client avant d'envoyer la requête si quota atteint
- Le serveur vérifie également (double vérification)

### 7.6 Accessibilité

- Tous les composants shadcn/ui sont basés sur Radix UI (accessibilité native)
- `aria-live="polite"` sur le compteur de résultats
- Focus management sur les modals (focus trap)
- Messages d'erreur liés aux champs via `aria-describedby`
- Navigation clavier complète sur les dropdowns d'autocomplétion

---

## 8. Authentification

### 8.1 Configuration NextAuth.js v5

```typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        return user
      }
    })
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 jours
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.plan = user.plan
        token.searchesToday = user.searchesToday
      }
      return token
    },
    session({ session, token }) {
      session.user.plan = token.plan
      session.user.searchesToday = token.searchesToday
      return session
    }
  }
})
```

### 8.2 Middleware de protection des routes

```typescript
// middleware.ts
export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: ['/search', '/lists/:path*', '/account/:path*', '/api/search', '/api/lists/:path*', '/api/export']
}
```

### 8.3 Flux de réinitialisation de mot de passe

1. `POST /api/auth/forgot-password` → génère un token (cuid, TTL 1h) stocké en Redis
2. Email envoyé avec lien `https://prospectnaf.fr/reset-password?token=xxx`
3. `POST /api/auth/reset-password` → vérifie le token Redis, met à jour le hash, invalide le token

### 8.4 Sécurité des mots de passe

```typescript
import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}
```

---

## 9. Paiement Stripe

### 9.1 Flux de souscription

```typescript
// app/api/billing/checkout/route.ts

export async function POST(req: Request) {
  const session = await auth()
  const { plan } = await req.json()  // 'SOLO' | 'PRO'

  const priceId = plan === 'SOLO' ? STRIPE_SOLO_PRICE_ID : STRIPE_PRO_PRICE_ID

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: session.user.stripeCustomerId ?? undefined,
    customer_email: session.user.stripeCustomerId ? undefined : session.user.email,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${BASE_URL}/account?success=true`,
    cancel_url: `${BASE_URL}/account?canceled=true`,
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId: session.user.id }
    }
  })

  return Response.json({ url: checkoutSession.url })
}
```

### 9.2 Webhook Stripe

```typescript
// app/api/billing/webhook/route.ts
// Événements traités :

// checkout.session.completed → activer le plan, sauvegarder stripeCustomerId + stripeSubId
// customer.subscription.updated → mettre à jour le plan (upgrade/downgrade)
// customer.subscription.deleted → downgrade vers FREE
// invoice.payment_failed → log + email utilisateur (géré par Stripe)
```

**Sécurité webhook :** vérification de la signature Stripe via `stripe.webhooks.constructEvent`.

### 9.3 Mapping plans Stripe → Plans applicatifs

```typescript
const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_SOLO_PRICE_ID!]: 'SOLO',
  [process.env.STRIPE_PRO_PRICE_ID!]:  'PRO',
}
```

---

## 10. Export CSV

### 10.1 Génération

```typescript
// app/api/export/route.ts
import Papa from 'papaparse'

const CSV_COLUMNS = [
  'siren', 'siret_siege', 'denomination',
  'adresse_numero', 'adresse_voie', 'code_postal', 'ville',
  'departement', 'region', 'code_naf', 'libelle_naf',
  'tranche_effectif', 'date_creation', 'forme_juridique',
  'statut', 'statut_annotation', 'note', 'priorite', 'date_ajout_liste'
]

export async function GET(req: Request) {
  // Vérification plan (export désactivé pour FREE)
  // Récupération des données (liste ou sélection)
  // Limite 500 lignes pour SOLO

  const csv = Papa.unparse(rows, {
    columns: CSV_COLUMNS,
    delimiter: userPrefersSemicolon ? ';' : ',',
  })

  // BOM UTF-8 pour compatibilité Excel
  const bom = '\uFEFF'
  const filename = `prospectnaf_${slugify(listName)}_${format(new Date(), 'yyyyMMdd')}.csv`

  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
}
```

### 10.2 Limites par plan

| Plan | Limite lignes | Export activé |
|---|---|---|
| FREE | — | Non |
| SOLO | 500 | Oui |
| PRO | Illimité | Oui |

---

## 11. Emails transactionnels

### 11.1 Configuration Resend

```typescript
// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to, subject, template
}: {
  to: string
  subject: string
  template: React.ReactElement
}) {
  return resend.emails.send({
    from: 'ProspectNAF <noreply@prospectnaf.fr>',
    to,
    subject,
    react: template,
  })
}
```

### 11.2 Templates d'emails

| Template | Déclencheur | Fichier |
|---|---|---|
| Confirmation d'inscription | Après `register` | `emails/ConfirmEmail.tsx` |
| Réinitialisation mot de passe | Après `forgot-password` | `emails/ResetPassword.tsx` |
| Rappel fin d'essai J-3 | Cron job | `emails/TrialReminder.tsx` |
| Rappel fin d'essai J-1 | Cron job | `emails/TrialReminder.tsx` |
| Confirmation suppression compte | Après `delete-account` | `emails/AccountDeleted.tsx` |

### 11.3 Cron jobs (Vercel Cron)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/trial-reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/reset-search-quotas",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## 12. Cache & performance

### 12.1 Stratégie de cache Redis

| Donnée | Clé Redis | TTL | Invalidation |
|---|---|---|---|
| Résultats de recherche | `search:{hash(params)}` | 24h | Manuelle (admin) |
| Données entreprise | `company:{siren}` | 7 jours | Manuelle |
| Quota recherches | `quota:{userId}:{date}` | 25h | Automatique (TTL) |
| Token reset password | `reset:{token}` | 1h | Après utilisation |
| Rate limit auth | `ratelimit:auth:{ip}` | 15 min | Automatique (TTL) |

### 12.2 Clé de cache pour les recherches

```typescript
import { createHash } from 'crypto'

function buildCacheKey(params: SearchParams): string {
  const normalized = JSON.stringify({
    naf: [...params.nafCodes].sort(),
    loc: [...(params.locations ?? [])].sort(),
    eff: [...(params.effectifs ?? [])].sort(),
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    statut: params.statut,
    formes: [...(params.formes ?? [])].sort(),
    page: params.page,
    perPage: params.perPage,
  })
  return `search:${createHash('sha256').update(normalized).digest('hex').slice(0, 16)}`
}
```

### 12.3 Optimisations Next.js

- `generateStaticParams` pour les pages statiques (landing, `/data`)
- `unstable_cache` pour les données semi-statiques (liste des codes NAF)
- Images optimisées via `next/image`
- Fonts via `next/font` (pas de FOUT)

---

## 13. Watchlists & jobs (V2)

### 13.1 Modèle de données (V2)

```prisma
model Watchlist {
  id          String   @id @default(cuid())
  userId      String
  listId      String
  name        String
  nafCodes    String[]
  locations   String[]
  effectifs   String[]
  frequency   String   @default("WEEKLY")  // WEEKLY | MONTHLY
  sendDay     Int      @default(1)          // 1=Lundi
  isActive    Boolean  @default(true)
  lastRunAt   DateTime?
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  list        List     @relation(fields: [listId], references: [id])
  sentSirens  WatchlistSentSiren[]
}

model WatchlistSentSiren {
  watchlistId String
  siren       String   @db.Char(9)
  sentAt      DateTime @default(now())

  watchlist   Watchlist @relation(fields: [watchlistId], references: [id], onDelete: Cascade)

  @@id([watchlistId, siren])
}
```

### 13.2 Job de traitement (V2)

```typescript
// app/api/cron/watchlists/route.ts
// Exécuté chaque lundi matin à 7h UTC

// Pour chaque watchlist active dont c'est le jour d'envoi :
// 1. Lancer la recherche avec les critères sauvegardés
// 2. Filtrer les SIREN déjà dans la liste liée
// 3. Filtrer les SIREN déjà envoyés (WatchlistSentSiren)
// 4. Si nouvelles entreprises : envoyer l'email d'alerte
// 5. Sauvegarder les SIREN envoyés dans WatchlistSentSiren
// 6. Mettre à jour lastRunAt
```

---

## 14. Sécurité

### 14.1 Headers HTTP

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js nécessite unsafe-eval en dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.stripe.com https://recherche-entreprises.api.gouv.fr",
      "frame-src https://js.stripe.com",
    ].join('; ')
  },
]
```

### 14.2 Rate limiting

```typescript
// lib/ratelimit.ts — via Upstash Redis

// Auth endpoints : 10 requêtes / 15 minutes / IP
// API search : 60 requêtes / minute / utilisateur
// API export : 10 requêtes / minute / utilisateur
// Webhook Stripe : pas de rate limit (vérification signature)
```

### 14.3 Validation des entrées

- Toutes les entrées API validées via Zod avant traitement
- Paramètres de recherche sanitisés avant transmission à l'API gouvernementale
- Pas d'interpolation directe de paramètres dans les requêtes SQL (Prisma paramétré)
- Taille maximale des corps de requête : 1MB (Next.js default)

### 14.4 Protection CSRF

- NextAuth.js gère la protection CSRF nativement pour les endpoints d'auth
- API Routes protégées par vérification de session JWT (pas de cookies de session classiques)

---

## 15. Infrastructure & déploiement

### 15.1 Environnements

| Environnement | URL | Base de données | Notes |
|---|---|---|---|
| Production | `prospectnaf.fr` | Neon (prod) | Déploiement sur merge `main` |
| Preview | `*.vercel.app` | Neon (dev) | Déploiement sur chaque PR |
| Local | `localhost:3000` | PostgreSQL local | `.env.local` |

### 15.2 Pipeline CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
# Déclenché sur : push sur main, pull_request

jobs:
  lint:
    - eslint + prettier check

  typecheck:
    - tsc --noEmit

  test:
    - vitest run (unit tests)
    - playwright test (e2e, sur preview URL)

  deploy:
    - vercel deploy (automatique via intégration Vercel/GitHub)
```

### 15.3 Base de données — Neon PostgreSQL

- Neon serverless PostgreSQL (compatible Prisma)
- Connexion pooling via `@neondatabase/serverless` pour les Vercel Edge Functions
- Backups automatiques quotidiens (rétention 7 jours sur le plan gratuit)
- Branche de base de données par PR (Neon branching)

### 15.4 Mise à jour Sirene locale (mensuelle)

```yaml
# .github/workflows/update-sirene.yml
# Déclenchement : 1er du mois à 2h UTC + déclenchement manuel

steps:
  - Téléchargement fichier Sirene (StockEtablissement_utf8.zip)
  - Décompression et parsing CSV
  - Import dans table temporaire PostgreSQL
  - Swap atomique (RENAME TABLE)
  - Notification Slack du résultat
```

---

## 16. Monitoring & observabilité

### 16.1 Sentry

- Capture des erreurs côté client et serveur
- Source maps uploadées à chaque déploiement
- Alertes sur les erreurs critiques (500, quota API dépassé)
- Filtrage des données sensibles (emails, tokens)

```typescript
// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% des transactions
  beforeSend(event) {
    // Supprimer les données personnelles
    delete event.user?.email
    return event
  }
})
```

### 16.2 Vercel Analytics

- Web Vitals automatiques (LCP, FID, CLS)
- Métriques de performance par route
- Pas de données personnelles collectées

### 16.3 Logs structurés

```typescript
// lib/logger.ts
// Format JSON pour faciliter l'analyse dans Vercel Logs

logger.info('search.completed', {
  userId: session.user.id,
  plan: session.user.plan,
  nafCount: params.nafCodes.length,
  resultCount: results.total,
  source: results.source,  // 'api' | 'cache' | 'local'
  durationMs: Date.now() - startTime,
})
```

### 16.4 Alertes opérationnelles

| Condition | Action |
|---|---|
| API gouvernementale indisponible > 5 min | Alerte Sentry + bascule automatique sur fallback local |
| Taux d'erreur 5xx > 1% | Alerte Sentry |
| Quota API gouvernementale > 80% | Alerte email admin |
| Échec mise à jour Sirene mensuelle | Notification Slack |

---

## 17. Variables d'environnement

```bash
# Base de données
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="https://prospectnaf.fr"
NEXTAUTH_SECRET="..."

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_SOLO_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Resend (emails)
RESEND_API_KEY="re_..."

# Sentry
SENTRY_DSN="https://...@sentry.io/..."
SENTRY_AUTH_TOKEN="..."

# App
NEXT_PUBLIC_APP_URL="https://prospectnaf.fr"
CRON_SECRET="..."  # Pour sécuriser les endpoints /api/cron/*
```

**Variables d'environnement de développement (`.env.local`) :**
- `STRIPE_SECRET_KEY` → clé de test Stripe (`sk_test_...`)
- `NEXTAUTH_URL` → `http://localhost:3000`
- Pas de `SENTRY_DSN` en local (désactivé)
