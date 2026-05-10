# Implementation Plan — ProspectNAF

## Overview

Implémentation du MVP ProspectNAF en Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL + Redis + Stripe. Les tâches sont ordonnées pour avoir un système fonctionnel le plus tôt possible.

## Tasks

- [-] 1. Initialisation du projet et infrastructure de base
  - Créer le projet Next.js 14 avec TypeScript, Tailwind CSS, shadcn/ui
  - Configurer Prisma avec le schéma complet (User, List, ListCompany, SireneCompany)
  - Configurer le client Redis (Upstash)
  - Mettre en place ESLint, Prettier, Vitest, fast-check
  - Créer les fichiers de types partagés (`types/company.ts`, `types/plan.ts`)
  - _Requirements: tous_

- [ ] 2. Authentification
  - [ ] 2.1 Configurer NextAuth.js v5 avec le provider Credentials et PrismaAdapter
    - Implémenter `lib/auth.ts` avec JWT strategy, callbacks plan/searchesToday
    - Implémenter le middleware de protection des routes (`middleware.ts`)
    - _Requirements: 1.4_
  - [ ] 2.2 Implémenter l'inscription (`POST /api/auth/register`)
    - Validation Zod (email format, password complexity)
    - Hash bcrypt (rounds=12), création User en base
    - Envoi email de confirmation via Resend
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ]* 2.3 Écrire les property tests pour la validation du mot de passe
    - **Property 1 : Password validation rejects non-compliant passwords**
    - **Validates: Requirements 1.3**
  - [ ] 2.4 Implémenter la réinitialisation de mot de passe
    - `POST /api/auth/forgot-password` → token Redis TTL 1h → email
    - `POST /api/auth/reset-password` → vérification token → update hash
    - _Requirements: 1.5, 1.6_
  - [ ] 2.5 Implémenter la suppression de compte (`DELETE /api/auth/account`)
    - Suppression en cascade (User → Lists → ListCompanies)
    - Résiliation abonnement Stripe si actif
    - Email de confirmation
    - _Requirements: 1.7_
  - [ ]* 2.6 Écrire le property test pour la suppression de compte
    - **Property 2 : Account deletion removes all user data**
    - **Validates: Requirements 1.7**
  - [ ] 2.7 Créer les pages UI d'authentification
    - `/login`, `/register`, `/forgot-password`, `/reset-password`
    - Formulaires avec react-hook-form + validation Zod côté client
    - _Requirements: 1.1, 1.2, 1.4_

- [ ] 3. Checkpoint — Auth fonctionnelle
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Moteur de recherche — backend
  - [ ] 4.1 Implémenter `lib/sirene.ts` — wrapper API gouvernementale
    - Fonction `searchCompanies(params)` avec appel API + transformation
    - Fonction `transformCompany(raw)` : mapping ApiCompany → Company
    - Constantes EFFECTIF_LABELS et FORME_JURIDIQUE_LABELS
    - _Requirements: 2.1, 2.6_
  - [ ] 4.2 Implémenter `lib/quota.ts` — Quota_Guard
    - Fonctions `checkSearchQuota`, `incrementSearchCount`
    - Fonctions `checkListQuota`, `checkCompanyQuota`
    - Constante PLAN_LIMITS avec toutes les limites par plan
    - _Requirements: 2.8, 2.9, 5.4, 5.5, 6.5, 7.3_
  - [ ]* 4.3 Écrire les property tests pour le Quota_Guard
    - **Property 6 : FREE plan quota enforcement**
    - **Validates: Requirements 2.8, 2.9**
  - [ ] 4.4 Implémenter le cache Redis pour les recherches
    - Fonction `buildCacheKey(params)` avec hash SHA-256 normalisé
    - Lookup/store dans Redis avec TTL 24h
    - _Requirements: 2.7_
  - [ ] 4.5 Implémenter `POST /api/search`
    - Validation Zod du SearchSchema
    - Pipeline : auth → quota → cache → API → transform → store cache → filter by plan
    - Fallback local Sirene si API indisponible
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8_
  - [ ]* 4.6 Écrire les property tests pour la logique de recherche
    - **Property 3 : Search requires at least one NAF code**
    - **Property 4 : NAF OR logic — union of results**
    - **Property 5 : Combined filters produce a subset**
    - **Validates: Requirements 2.2, 2.3, 2.5**

- [ ] 5. Autocomplétion NAF et géographique
  - [ ] 5.1 Créer `public/naf-codes.json` avec les ~700 codes NAF + synonymes
    - _Requirements: 3.1, 3.2_
  - [ ] 5.2 Implémenter `lib/naf.ts` — fonction `searchNaf(query)`
    - Recherche dans labels et synonymes, retourne max 10 résultats
    - _Requirements: 3.1, 3.2_
  - [ ]* 5.3 Écrire le property test pour l'autocomplétion NAF
    - **Property 7 : NAF autocomplete result count**
    - **Validates: Requirements 3.1**
  - [ ] 5.4 Implémenter `GET /api/naf/autocomplete`
    - _Requirements: 3.1_
  - [ ] 5.5 Implémenter `lib/geo.ts` — résolution géographique
    - Données géo statiques (communes, départements, régions)
    - Fonctions `searchGeo(query)` et `resolveToApiParams(locations)`
    - _Requirements: 3.3, 3.4_
  - [ ]* 5.6 Écrire le property test pour la résolution géographique
    - **Property (dérivée de 3.4) : Geographic resolution produces valid API params**
    - **Validates: Requirements 3.4**

- [ ] 6. Frontend — page de recherche et résultats
  - [ ] 6.1 Créer le composant `SearchForm`
    - Champs NAF (multi-select, max 5), localisation (max 3), effectif, dates, statut, formes juridiques
    - Filtres avancés masqués par défaut
    - _Requirements: 2.1, 2.2, 3.1, 3.3_
  - [ ] 6.2 Créer les composants `NafAutocomplete` et `LocationAutocomplete`
    - Debounce 150ms, navigation clavier, aria-live
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 6.3 Créer le composant `CompanyCard`
    - Affichage de toutes les données requises, badge statut, liens Pappers/Société.com
    - Case à cocher de sélection
    - _Requirements: 4.1_
  - [ ] 6.4 Créer le composant `ResultsHeader` et `Pagination`
    - Compteur de résultats, tri, compteur de sélection, boutons d'action
    - Pagination 25/page, options 50/100 pour plans payants
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  - [ ] 6.5 Assembler la page `/search`
    - Gestion du quota côté client (bandeau d'avertissement, modal d'upgrade)
    - _Requirements: 2.8, 2.9, 4.1_

- [ ] 7. Checkpoint — Recherche fonctionnelle end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Gestion des listes
  - [ ] 8.1 Implémenter `GET /api/lists` et `POST /api/lists`
    - Vérification quota listes (plan FREE : max 1)
    - Déduplication des SIREN à l'insertion
    - _Requirements: 5.1, 5.4, 5.5_
  - [ ]* 8.2 Écrire les property tests pour la gestion des listes
    - **Property 8 : SIREN uniqueness within a list**
    - **Property 9 : Plan quota limits are enforced for lists**
    - **Validates: Requirements 5.2, 5.4**
  - [ ] 8.3 Implémenter `GET/PUT/DELETE /api/lists/:id`
    - PUT : renommage uniquement (nom, max 80 chars)
    - DELETE : suppression en cascade avec confirmation
    - _Requirements: 5.6, 5.7_
  - [ ]* 8.4 Écrire les property tests pour rename et delete
    - **Property 10 : List rename preserves contents**
    - **Property 2 (partiel) : List deletion removes all annotations**
    - **Validates: Requirements 5.6, 5.7**
  - [ ] 8.5 Implémenter `POST /api/lists/:id/companies` et `DELETE /api/lists/:id/companies/:siren`
    - Vérification quota entreprises par liste
    - Réponse avec `{ added, alreadyPresent, limitReached }`
    - _Requirements: 5.2, 5.3, 5.4, 5.5_
  - [ ] 8.6 Créer les pages UI `/lists` et `/lists/[id]`
    - Tableau des listes, modal de création/renommage, vue détail avec filtres par statut
    - Modal `SaveListModal` depuis la page de résultats
    - _Requirements: 5.1, 5.6, 5.7_

- [ ] 9. Annotations
  - [ ] 9.1 Implémenter `PATCH /api/lists/:id/companies/:siren`
    - Mise à jour status, note (max 500 chars), isPriority
    - Vérification plan SOLO+ pour les annotations
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  - [ ]* 9.2 Écrire les property tests pour les annotations
    - **Property 11 : Annotation round-trip persistence**
    - **Property 12 : Annotation independence across lists**
    - **Validates: Requirements 6.1, 6.3, 6.4**
  - [ ] 9.3 Créer le composant `AnnotationPanel`
    - Sélecteur de statut (6 valeurs), champ note avec debounce 1s, toggle priorité
    - Désactivé visuellement pour les utilisateurs FREE
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 10. Export CSV
  - [ ] 10.1 Implémenter `GET /api/export`
    - Génération CSV avec PapaParse, BOM UTF-8, toutes les colonnes requises
    - Vérification plan (FREE → 403, SOLO → max 500 lignes)
    - Nom de fichier selon le pattern spécifié
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [ ]* 10.2 Écrire les property tests pour l'export CSV
    - **Property 13 : CSV export format correctness**
    - **Property 14 : SOLO plan export row limit**
    - **Validates: Requirements 7.1, 7.2, 7.4**

- [ ] 11. Checkpoint — Listes, annotations et export fonctionnels
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Facturation Stripe
  - [ ] 12.1 Configurer Stripe et les produits/prix
    - `lib/stripe.ts` — client Stripe singleton
    - Variables d'environnement STRIPE_SOLO_PRICE_ID, STRIPE_PRO_PRICE_ID
    - _Requirements: 8.1_
  - [ ] 12.2 Implémenter `POST /api/billing/checkout`
    - Création session Stripe Checkout avec trial_period_days=14 pour SOLO
    - _Requirements: 8.1, 8.5_
  - [ ] 12.3 Implémenter `POST /api/billing/webhook`
    - Vérification signature Stripe
    - Handlers : checkout.session.completed, subscription.updated, subscription.deleted
    - _Requirements: 8.2, 8.3, 8.6, 8.7_
  - [ ]* 12.4 Écrire les tests pour le webhook Stripe
    - **Property 15 : Stripe webhook signature verification**
    - **Validates: Requirements 8.7**
  - [ ] 12.5 Implémenter les cron jobs Vercel
    - `/api/cron/reset-search-quotas` — minuit UTC
    - `/api/cron/trial-reminders` — J-3 et J-1 avant fin d'essai
    - _Requirements: 8.6_
  - [ ] 12.6 Créer la page `/account`
    - Affichage plan actuel, bouton portail Stripe, modification email/mot de passe
    - Bouton suppression de compte avec confirmation
    - _Requirements: 8.4_

- [ ] 13. Emails transactionnels
  - [ ] 13.1 Configurer Resend et créer les templates React Email
    - `ConfirmEmail.tsx`, `ResetPassword.tsx`, `TrialReminder.tsx`, `AccountDeleted.tsx`
    - _Requirements: 1.1, 1.5, 1.7, 8.6_

- [ ] 14. Sécurité et headers
  - [ ] 14.1 Configurer les headers de sécurité dans `next.config.ts`
    - CSP, HSTS, X-Frame-Options, X-Content-Type-Options
  - [ ] 14.2 Implémenter le rate limiting via Upstash Redis
    - Auth endpoints : 10 req / 15 min / IP
    - Search : 60 req / min / user
    - Export : 10 req / min / user

- [ ] 15. Checkpoint final — Ensure all tests pass, ask the user if questions arise.

## Notes

- Les tâches marquées `*` sont optionnelles (tests) — elles peuvent être sautées pour un MVP plus rapide
- Chaque property test référence explicitement une propriété du design document
- Les checkpoints permettent de valider l'avancement avant de continuer
- La base Sirene locale (fallback) peut être peuplée avec un sous-ensemble de données pour les tests
