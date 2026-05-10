# Design Document — ProspectNAF

## Overview

ProspectNAF est un micro-SaaS Next.js 14 (App Router) en monorepo. Le frontend et le backend cohabitent dans la même application Vercel. Les données Sirene proviennent de l'API gouvernementale avec fallback sur une base PostgreSQL locale. La facturation est entièrement déléguée à Stripe.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel (Next.js 14)                  │
│  App Router (RSC + Client Components)                    │
│  API Routes (/api/*)                                     │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
       ┌───────▼──────┐          ┌────────▼────────┐
       │ Upstash Redis │          │  Neon PostgreSQL │
       │ - cache 24h   │          │  - users, lists  │
       │ - quotas      │          │  - annotations   │
       │ - rate limit  │          │  - sirene local  │
       └───────────────┘          └─────────────────┘
               │
       ┌───────▼──────────────────────────┐
       │  API Recherche Entreprises        │
       │  recherche-entreprises.api.gouv.fr│
       └──────────────────────────────────┘
```

## Components and Interfaces

### Backend modules

**`lib/quota.ts`** — Quota_Guard
```typescript
interface QuotaPlan {
  searchesPerDay: number | null   // null = unlimited
  resultsPerSearch: number | null
  maxLists: number | null
  maxCompaniesPerList: number | null
  canExport: boolean
  canAnnotate: boolean
  exportRowLimit: number | null
}

const PLAN_LIMITS: Record<Plan, QuotaPlan> = {
  FREE:  { searchesPerDay: 3, resultsPerSearch: 20, maxLists: 1, maxCompaniesPerList: 20, canExport: false, canAnnotate: false, exportRowLimit: null },
  SOLO:  { searchesPerDay: null, resultsPerSearch: 500, maxLists: 10, maxCompaniesPerList: 500, canExport: true, canAnnotate: true, exportRowLimit: 500 },
  PRO:   { searchesPerDay: null, resultsPerSearch: null, maxLists: null, maxCompaniesPerList: null, canExport: true, canAnnotate: true, exportRowLimit: null },
}

async function checkSearchQuota(userId: string, plan: Plan): Promise<void>
async function incrementSearchCount(userId: string): Promise<void>
async function checkListQuota(userId: string, plan: Plan): Promise<void>
async function checkCompanyQuota(listId: string, plan: Plan, toAdd: number): Promise<void>
```

**`lib/sirene.ts`** — Search_Engine
```typescript
interface SearchParams {
  nafCodes: string[]       // min 1, max 5
  locations?: string[]     // max 3
  effectifs?: string[]
  dateFrom?: string        // ISO date
  dateTo?: string
  statut: 'ACTIF' | 'FERME' | 'TOUS'
  formes?: string[]
  page: number
  perPage: number
}

interface SearchResult {
  total: number
  results: Company[]
  source: 'api' | 'cache' | 'local'
}

async function searchCompanies(params: SearchParams): Promise<SearchResult>
function transformCompany(raw: ApiCompany): Company
function buildCacheKey(params: SearchParams): string
```

**`lib/naf.ts`** — NAF autocomplete
```typescript
interface NafEntry { code: string; label: string; synonyms: string[] }

function searchNaf(query: string): NafEntry[]   // max 10, debounced client-side
```

**`lib/geo.ts`** — Geographic resolution
```typescript
interface GeoResult { type: 'commune' | 'departement' | 'region'; code: string; label: string }

function searchGeo(query: string): GeoResult[]
function resolveToApiParams(locations: GeoResult[]): { departement?: string; commune?: string }
```

### API Routes

| Method | Route | Auth | Plan |
|--------|-------|------|------|
| POST | `/api/auth/register` | — | — |
| POST | `/api/auth/forgot-password` | — | — |
| POST | `/api/auth/reset-password` | — | — |
| DELETE | `/api/auth/account` | ✓ | any |
| POST | `/api/search` | ✓ | FREE+ |
| GET | `/api/naf/autocomplete` | — | — |
| GET | `/api/lists` | ✓ | any |
| POST | `/api/lists` | ✓ | FREE+ |
| GET | `/api/lists/:id` | ✓ | any |
| PUT | `/api/lists/:id` | ✓ | any |
| DELETE | `/api/lists/:id` | ✓ | any |
| POST | `/api/lists/:id/companies` | ✓ | FREE+ |
| DELETE | `/api/lists/:id/companies/:siren` | ✓ | any |
| PATCH | `/api/lists/:id/companies/:siren` | ✓ | SOLO+ |
| GET | `/api/export` | ✓ | SOLO+ |
| POST | `/api/billing/checkout` | ✓ | any |
| POST | `/api/billing/webhook` | — (sig) | — |

## Data Models

### Prisma Schema (core)

```prisma
enum Plan { FREE SOLO PRO }

enum AnnotationStatus {
  UNTREATED TO_CONTACT IN_PROGRESS INTERESTING NOT_RELEVANT ARCHIVED
}

model User {
  id               String    @id @default(cuid())
  email            String    @unique
  emailVerified    DateTime?
  passwordHash     String
  firstName        String?
  plan             Plan      @default(FREE)
  stripeCustomerId String?   @unique
  stripeSubId      String?   @unique
  trialEndsAt      DateTime?
  searchesToday    Int       @default(0)
  searchesResetAt  DateTime  @default(now())
  csvSeparator     String    @default(",") @db.Char(1)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  lists            List[]
}

model List {
  id        String        @id @default(cuid())
  userId    String
  name      String        @db.VarChar(80)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  companies ListCompany[]
  @@index([userId])
}

model ListCompany {
  id         String           @id @default(cuid())
  listId     String
  siren      String           @db.Char(9)
  addedAt    DateTime         @default(now())
  status     AnnotationStatus @default(UNTREATED)
  note       String?          @db.VarChar(500)
  isPriority Boolean          @default(false)
  list       List             @relation(fields: [listId], references: [id], onDelete: Cascade)
  @@unique([listId, siren])
  @@index([listId])
}

model SireneCompany {
  siren           String    @id @db.Char(9)
  siretSiege      String    @db.Char(14)
  denomination    String
  adresseNumero   String?
  adresseVoie     String?
  codePostal      String?   @db.Char(5)
  ville           String?
  codeDept        String?   @db.Char(3)
  codeRegion      String?   @db.Char(2)
  codeNaf         String    @db.Char(6)
  libelleNaf      String
  trancheEffectif String?   @db.Char(2)
  dateCreation    DateTime?
  formeJuridique  String?
  isActive        Boolean   @default(true)
  updatedAt       DateTime  @updatedAt
  @@index([codeNaf])
  @@index([codeDept])
  @@index([isActive])
}
```

### Company type (shared)

```typescript
interface Company {
  siren: string
  siretSiege: string
  denomination: string
  adresseNumero?: string
  adresseVoie?: string
  codePostal?: string
  ville?: string
  departement?: string
  region?: string
  codeNaf: string
  libelleNaf: string
  trancheEffectif?: string
  libelleEffectif: string
  dateCreation?: string
  formeJuridique?: string
  isActive: boolean
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1 : Password validation rejects non-compliant passwords

*For any* string that is shorter than 8 characters, or lacks an uppercase letter, or lacks a digit, the Auth_Service registration function SHALL reject it with a validation error.

**Validates: Requirements 1.3**

---

### Property 2 : Account deletion removes all user data

*For any* user with lists, annotations, and sessions, deleting the account SHALL result in zero lists, zero annotations, and zero sessions remaining in the database for that user.

**Validates: Requirements 1.7**

---

### Property 3 : Search requires at least one NAF code

*For any* search request with an empty nafCodes array, the Search_Engine SHALL return a validation error and SHALL NOT call the external API.

**Validates: Requirements 2.2**

---

### Property 4 : NAF OR logic — union of results

*For any* two disjoint NAF codes A and B, the count of results for [A, B] combined SHALL be greater than or equal to the count for A alone and greater than or equal to the count for B alone.

**Validates: Requirements 2.3**

---

### Property 5 : Combined filters produce a subset (AND logic)

*For any* search with NAF codes and an effectif filter, the result set SHALL be a subset of the results obtained with NAF codes alone (no effectif filter).

**Validates: Requirements 2.5**

---

### Property 6 : FREE plan quota enforcement

*For any* FREE plan user, the Search_Engine SHALL never return more than 20 results per search, and SHALL return a 429 error on the 4th search attempt within the same UTC day.

**Validates: Requirements 2.8, 2.9**

---

### Property 7 : NAF autocomplete result count

*For any* query string of 2 or more characters, the NAF autocomplete function SHALL return between 0 and 10 results inclusive.

**Validates: Requirements 3.1**

---

### Property 8 : SIREN uniqueness within a list

*For any* list and any SIREN, adding the same SIREN multiple times SHALL result in that SIREN appearing exactly once in the list.

**Validates: Requirements 5.2**

---

### Property 9 : Plan quota limits are enforced for lists

*For any* FREE plan user, the List_Manager SHALL reject list creation when the user already has 1 list, and SHALL reject adding a company when the list already contains 20 companies.

**Validates: Requirements 5.4**

---

### Property 10 : List rename preserves contents

*For any* list with N companies, renaming the list SHALL leave the company count and all SIRENs unchanged.

**Validates: Requirements 5.7**

---

### Property 11 : Annotation round-trip persistence

*For any* valid (listId, siren) pair and any AnnotationStatus value, setting the status and then reading it back SHALL return the same status value.

*For any* string of up to 500 characters, saving it as a note and reading it back SHALL return the identical string.

**Validates: Requirements 6.1, 6.3**

---

### Property 12 : Annotation independence across lists

*For any* SIREN present in two different lists, setting a status in list A SHALL NOT affect the status of that SIREN in list B.

**Validates: Requirements 6.4**

---

### Property 13 : CSV export format correctness

*For any* list with at least one company, the exported CSV SHALL start with the UTF-8 BOM bytes (`\uFEFF`), and the header row SHALL contain all 19 required column names.

**Validates: Requirements 7.1, 7.2**

---

### Property 14 : SOLO plan export row limit

*For any* SOLO plan user exporting a list with more than 500 companies, the exported CSV SHALL contain exactly 500 data rows (excluding the header).

**Validates: Requirements 7.4**

---

### Property 15 : Stripe webhook signature verification

*For any* POST request to `/api/billing/webhook` without a valid Stripe signature header, the Billing_Service SHALL return a 400 response and SHALL NOT modify any user's plan.

**Validates: Requirements 8.7**

---

## Error Handling

All API routes return a uniform error envelope:

```typescript
{ error: { code: string; message: string; details?: unknown } }
```

| HTTP | Code | Trigger |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Zod schema failure |
| 401 | `UNAUTHORIZED` | Missing or invalid session |
| 403 | `FORBIDDEN` | Plan insufficient |
| 429 | `QUOTA_EXCEEDED` | Daily search limit reached |
| 503 | `API_UNAVAILABLE` | External API down, local fallback also failed |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

The Search_Engine catches external API errors and attempts the local Sirene fallback before surfacing a 503.

## Testing Strategy

### Dual approach

- **Unit tests** (Vitest) : validation functions, transformers, quota logic, CSV generation, cache key building
- **Property-based tests** (fast-check) : universal properties listed above, minimum 100 runs each

### Property-based testing configuration

Library: **fast-check** (TypeScript-native, excellent arbitrary generators)

```typescript
// Each PBT is tagged for traceability
// Feature: prospect-naf, Property N: <property text>
import fc from 'fast-check'

test('Property N: ...', () => {
  fc.assert(fc.property(
    fc.record({ ... }),  // arbitrary input
    (input) => {
      // property assertion
    }
  ), { numRuns: 100 })
})
```

### E2E tests (Playwright)

Critical user flows:
1. Register → confirm → search → save list → export CSV
2. Upgrade to SOLO via Stripe test mode → verify plan update
3. Reach FREE quota → verify upgrade modal
