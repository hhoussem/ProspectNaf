# Requirements Document — ProspectNAF

## Introduction

ProspectNAF est un micro-SaaS de ciblage B2B permettant de construire des listes d'entreprises françaises à prospecter à partir des données publiques Sirene. Le MVP couvre l'authentification, le moteur de recherche par code NAF, la sauvegarde de listes, les annotations, l'export CSV et la facturation Stripe.

## Glossaire

- **NAF** : Nomenclature des Activités Françaises — code à 5 caractères (ex : 6201Z)
- **SIREN** : Identifiant unique d'une entreprise (9 chiffres)
- **SIRET** : Identifiant d'un établissement (SIREN + 5 chiffres)
- **Sirene** : Base de données publique INSEE des entreprises françaises
- **Liste** : Collection d'entreprises sauvegardées par un utilisateur avec annotations
- **Annotation** : Note, statut ou priorité ajoutés sur une entreprise dans une liste
- **Plan** : Niveau d'abonnement (FREE, SOLO, PRO)
- **Tranche d'effectif** : Code INSEE représentant une fourchette du nombre de salariés
- **System** : L'application ProspectNAF dans son ensemble
- **Auth_Service** : Module d'authentification et gestion des comptes
- **Search_Engine** : Module de recherche d'entreprises
- **List_Manager** : Module de gestion des listes et annotations
- **Export_Service** : Module d'export CSV
- **Billing_Service** : Module de gestion des plans et paiements Stripe
- **Quota_Guard** : Composant de vérification et enforcement des limites par plan

---

## Requirements

### Requirement 1 : Inscription et connexion

**User Story :** En tant que visiteur, je veux créer un compte et me connecter, afin d'accéder aux fonctionnalités de recherche et de sauvegarde.

#### Acceptance Criteria

1. WHEN a user submits a registration form with a valid email and a password of at least 8 characters containing one uppercase letter and one digit, THE Auth_Service SHALL create an account on the FREE plan and send a confirmation email.
2. IF a user submits a registration form with an email already in use, THEN THE Auth_Service SHALL return a validation error indicating the email is already taken.
3. IF a user submits a registration form with a password that does not meet the complexity requirements, THEN THE Auth_Service SHALL return a descriptive validation error.
4. WHEN a user submits valid login credentials, THE Auth_Service SHALL create a JWT session valid for 24 hours with a refresh token valid for 30 days.
5. WHEN a user requests a password reset, THE Auth_Service SHALL send a reset link valid for 1 hour to the provided email address.
6. IF a password reset token has expired or is invalid, THEN THE Auth_Service SHALL return an error and prompt the user to request a new link.
7. WHEN a user deletes their account, THE Auth_Service SHALL immediately delete all user data and cancel any active Stripe subscription.

---

### Requirement 2 : Moteur de recherche

**User Story :** En tant qu'utilisateur connecté, je veux rechercher des entreprises par secteur d'activité, localisation et taille, afin de construire une liste de prospects ciblée.

#### Acceptance Criteria

1. WHEN a user submits a search with at least one NAF code, THE Search_Engine SHALL return a paginated list of matching companies from the Sirene data source.
2. IF a user submits a search without any NAF code, THEN THE Search_Engine SHALL return a validation error indicating the sector field is required.
3. WHEN multiple NAF codes are provided, THE Search_Engine SHALL return companies matching any of the provided codes (OR logic).
4. WHEN multiple geographic zones are provided, THE Search_Engine SHALL return companies located in any of the provided zones (OR logic).
5. WHEN effectif and date filters are combined with NAF codes, THE Search_Engine SHALL return only companies matching all filters simultaneously (AND logic).
6. WHEN the external API is unavailable, THE Search_Engine SHALL fall back to the local Sirene database and indicate the data source in the response.
7. WHEN a search result is already cached, THE Search_Engine SHALL return the cached result within 500ms without calling the external API.
8. WHILE a user is on the FREE plan, THE Quota_Guard SHALL limit search results to 20 companies per search and 3 searches per day.
9. WHEN a FREE plan user reaches their daily search limit, THE Quota_Guard SHALL return a 429 response with an upgrade prompt.

---

### Requirement 3 : Autocomplétion NAF et géographique

**User Story :** En tant qu'utilisateur, je veux une autocomplétion sur les codes NAF et les zones géographiques, afin de trouver rapidement les bons critères de recherche.

#### Acceptance Criteria

1. WHEN a user types at least 2 characters in the sector field, THE Search_Engine SHALL return up to 10 matching NAF codes with their labels within 200ms.
2. THE Search_Engine SHALL search NAF autocomplete results in both official labels and common synonyms (e.g., "agence web" → 6201Z).
3. WHEN a user types at least 2 characters in the location field, THE Search_Engine SHALL return matching cities, postal codes, departments, and regions.
4. THE Search_Engine SHALL resolve location inputs to the appropriate API parameters (city → INSEE code, department → department code, region → list of departments).

---

### Requirement 4 : Affichage et pagination des résultats

**User Story :** En tant qu'utilisateur, je veux voir les résultats de recherche sous forme de cartes avec les informations clés, afin d'évaluer rapidement les entreprises.

#### Acceptance Criteria

1. THE System SHALL display each company result with: denomination, city, department, NAF code and label, effectif label, creation date, SIREN, legal form, and active/closed status.
2. WHEN results are displayed, THE System SHALL show 25 results per page by default.
3. WHILE a user is on the FREE plan, THE System SHALL limit display to the first page (20 results maximum).
4. WHEN a user selects companies, THE System SHALL maintain a selection counter visible in the results header.
5. WHEN a user clicks "Select all", THE System SHALL select all companies on the current page.

---

### Requirement 5 : Sauvegarde de listes

**User Story :** En tant qu'utilisateur, je veux sauvegarder des résultats de recherche dans des listes nommées, afin de les retrouver et les gérer ultérieurement.

#### Acceptance Criteria

1. WHEN a user saves a search result set with a name, THE List_Manager SHALL create a named list containing the selected companies.
2. THE List_Manager SHALL enforce uniqueness of a company (by SIREN) within a single list.
3. WHEN a company already present in a list is added again, THE List_Manager SHALL report the count of duplicates without adding them.
4. WHILE a user is on the FREE plan, THE Quota_Guard SHALL limit the user to 1 list with a maximum of 20 companies.
5. WHILE a user is on the SOLO plan, THE Quota_Guard SHALL limit the user to 10 lists with a maximum of 500 companies per list.
6. WHEN a user deletes a list, THE List_Manager SHALL permanently remove the list and all its annotations.
7. WHEN a user renames a list, THE List_Manager SHALL update the list name without modifying its contents.

---

### Requirement 6 : Annotations et statuts

**User Story :** En tant qu'utilisateur, je veux annoter les entreprises de mes listes avec un statut, une note et une priorité, afin de suivre mon avancement de prospection.

#### Acceptance Criteria

1. WHEN a user sets a status on a company in a list, THE List_Manager SHALL persist the status linked to that specific company-list pair.
2. THE List_Manager SHALL support the following statuses: UNTREATED (default), TO_CONTACT, IN_PROGRESS, INTERESTING, NOT_RELEVANT, ARCHIVED.
3. WHEN a user saves a note on a company in a list, THE List_Manager SHALL persist the note (maximum 500 characters) linked to that specific company-list pair.
4. WHEN the same company appears in two different lists, THE List_Manager SHALL maintain independent annotations for each list.
5. WHILE a user is on the FREE plan, THE Quota_Guard SHALL prevent creating or modifying annotations.

---

### Requirement 7 : Export CSV

**User Story :** En tant qu'utilisateur payant, je veux exporter mes listes en CSV, afin de les utiliser dans d'autres outils (CRM, tableur, etc.).

#### Acceptance Criteria

1. WHEN a SOLO or PRO user triggers an export, THE Export_Service SHALL generate a UTF-8 CSV file with BOM containing all specified columns.
2. THE Export_Service SHALL include the following columns: siren, siret_siege, denomination, adresse_numero, adresse_voie, code_postal, ville, departement, region, code_naf, libelle_naf, tranche_effectif, date_creation, forme_juridique, statut, statut_annotation, note, priorite, date_ajout_liste.
3. WHILE a user is on the FREE plan, THE Quota_Guard SHALL prevent CSV export and return a 403 response.
4. WHILE a user is on the SOLO plan, THE Quota_Guard SHALL limit each export to 500 rows maximum.
5. WHEN an export is generated, THE Export_Service SHALL name the file using the pattern `prospectnaf_[list-name]_[YYYYMMDD].csv`.
6. THE Export_Service SHALL use comma as the default column separator, with semicolon available as a user preference.

---

### Requirement 8 : Plans et facturation Stripe

**User Story :** En tant qu'utilisateur, je veux souscrire à un plan payant via Stripe, afin de débloquer les fonctionnalités avancées.

#### Acceptance Criteria

1. WHEN a user initiates a plan upgrade, THE Billing_Service SHALL redirect to a Stripe Checkout session for the selected plan.
2. WHEN Stripe confirms a successful subscription, THE Billing_Service SHALL immediately update the user's plan in the database.
3. WHEN a Stripe subscription is cancelled or payment fails after retries, THE Billing_Service SHALL downgrade the user to the FREE plan.
4. WHEN a user accesses account management, THE Billing_Service SHALL provide a link to the Stripe customer portal for subscription management.
5. WHEN a new SOLO subscription is created, THE Billing_Service SHALL apply a 14-day free trial without requiring a credit card.
6. WHEN a trial ends without payment, THE Billing_Service SHALL automatically downgrade the user to the FREE plan.
7. THE Billing_Service SHALL verify Stripe webhook signatures before processing any webhook event.
