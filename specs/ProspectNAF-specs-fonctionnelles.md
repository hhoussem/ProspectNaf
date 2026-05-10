# ProspectNAF — Spécifications Fonctionnelles
**Version** : 1.0  
**Date** : Mai 2026  
**Statut** : Draft  

---

## Table des matières

1. [Vue d'ensemble du produit](#1-vue-densemble)
2. [Architecture fonctionnelle](#2-architecture-fonctionnelle)
3. [Authentification & comptes](#3-authentification--comptes)
4. [Moteur de recherche](#4-moteur-de-recherche)
5. [Affichage des résultats](#5-affichage-des-résultats)
6. [Listes & sauvegarde](#6-listes--sauvegarde)
7. [Annotations & statuts](#7-annotations--statuts)
8. [Export](#8-export)
9. [Plans & limites](#9-plans--limites)
10. [Paiement (Stripe)](#10-paiement-stripe)
11. [Watchlists & alertes (V2)](#11-watchlists--alertes-v2)
12. [Intégrations (V3)](#12-intégrations-v3)
13. [API publique (V3)](#13-api-publique-v3)
14. [Données & sources](#14-données--sources)
15. [Règles métier](#15-règles-métier)
16. [Non-fonctionnel](#16-non-fonctionnel)
17. [Glossaire](#17-glossaire)

---

## 1. Vue d'ensemble

### 1.1 Objectif produit

ProspectNAF est un micro-SaaS de ciblage B2B qui permet à un freelance, une agence ou un commercial solo de construire en quelques minutes une liste d'entreprises françaises à prospecter, à partir des données publiques Sirene.

### 1.2 Périmètre MVP

| Inclus MVP | Hors périmètre MVP |
|---|---|
| Moteur de recherche NAF + localisation + effectif | Enrichissement email / téléphone |
| Affichage résultats avec données Sirene | Intégrations CRM natives |
| Export CSV | Watchlists / alertes |
| Sauvegarde de listes nommées | Collaboration multi-utilisateurs |
| Annotations et statuts par entreprise | Application mobile |
| Compte utilisateur + paiement Stripe | API publique |

### 1.3 Utilisateurs cibles

- Freelances B2B (développeurs, consultants, designers, formateurs)
- Agences digitales / web / SEO (1 à 30 personnes)
- Commerciaux solo et apporteurs d'affaires
- Startups early stage construisant leur première base de prospection

---

## 2. Architecture fonctionnelle

### 2.1 Modules principaux

```
ProspectNAF
├── Auth          → inscription, connexion, gestion compte
├── Search        → moteur de recherche + filtres
├── Results       → affichage, pagination, tri
├── Lists         → sauvegarde, gestion, renommage
├── Annotations   → notes, statuts par entreprise
├── Export        → CSV, copie presse-papier
├── Billing       → plans, Stripe, limites
├── Watchlist     → alertes (V2)
└── Integrations  → CRM, API (V3)
```

### 2.2 Sources de données

- **API principale** : `api.recherche-entreprises.api.gouv.fr` (API Recherche d'Entreprises)
- **Fallback / enrichissement** : fichier Sirene téléchargeable (INSEE, mise à jour mensuelle)
- **Données disponibles** : SIREN, SIRET, dénomination, adresse, code NAF, libellé NAF, tranche effectif, date création, forme juridique, statut actif/fermé

---

## 3. Authentification & comptes

### 3.1 Inscription

**Champs requis :**
- Email (validation format + unicité)
- Mot de passe (min. 8 caractères, 1 majuscule, 1 chiffre)
- Prénom (optionnel à l'inscription, demandé à la première connexion)

**Comportement :**
- Email de confirmation envoyé après inscription
- Compte actif immédiatement sur le plan Gratuit sans attendre la confirmation
- Confirmation email requise pour passer au plan payant

**Règles :**
- Un email = un compte
- Pas d'inscription via OAuth dans le MVP (Google/LinkedIn en V2)

### 3.2 Connexion

- Email + mot de passe
- Option "Rester connecté" (session 30 jours)
- Lien "Mot de passe oublié" → email de réinitialisation (lien valable 1h)

### 3.3 Gestion du compte

Page `/account` avec :
- Modification email (confirmation requise sur le nouvel email)
- Modification mot de passe
- Affichage du plan actuel + date de renouvellement
- Bouton "Gérer mon abonnement" → portail Stripe
- Bouton "Supprimer mon compte" (confirmation par saisie de l'email)

**Suppression de compte :**
- Suppression immédiate de toutes les données utilisateur
- Résiliation de l'abonnement Stripe
- Email de confirmation de suppression envoyé

---

## 4. Moteur de recherche

### 4.1 Interface de recherche

Page principale `/search`. Formulaire avec les champs suivants :

#### Champ 1 — Secteur d'activité (obligatoire)

- Saisie libre par mot-clé (ex : "agence web", "restaurant", "plombier")
- OU sélection directe d'un code NAF (ex : "6201Z")
- Autocomplétion sur les libellés NAF dès 2 caractères saisis
- Possibilité de sélectionner plusieurs codes NAF (max 5 dans le MVP)
- Affichage du libellé complet sous le code sélectionné

**Comportement de l'autocomplétion :**
- Recherche dans le libellé NAF (ex : "programmation" → 6201Z, 6202A...)
- Recherche dans les synonymes courants (ex : "agence web" → 6201Z, 7311Z...)
- Maximum 10 suggestions affichées
- Sélection au clic ou à la touche Entrée

#### Champ 2 — Localisation (optionnel)

- Saisie libre : ville, code postal, département (numéro ou nom), région
- Autocomplétion géographique dès 2 caractères
- Exemples : "Paris", "75", "Rhône", "69", "Île-de-France", "Lyon 6"
- Possibilité de sélectionner plusieurs zones (max 3 dans le MVP)
- Si vide : recherche nationale

**Résolution de la localisation :**
- Ville → code INSEE commune
- Code postal → liste des communes associées
- Département → code département (01 à 976)
- Région → liste des départements associés

#### Champ 3 — Taille / Tranche d'effectif (optionnel)

Sélection par cases à cocher (multi-sélection possible) :

| Label affiché | Tranche Sirene |
|---|---|
| Indépendant / 0 salarié | NN, 00 |
| 1 à 5 salariés | 01, 02 |
| 6 à 10 salariés | 03 |
| 11 à 50 salariés | 11, 12 |
| 51 à 200 salariés | 21, 22 |
| Plus de 200 salariés | 31, 32, 41, 42, 51, 52, 53 |
| Non renseigné | null |

#### Champ 4 — Date de création (optionnel)

- Sélecteur "Créées après le" avec saisie d'une année (ex : 2020) ou date complète
- Sélecteur "Créées avant le" (optionnel, pour cibler une période)
- Raccourcis : "Dernière année", "2 dernières années", "5 dernières années"

#### Champ 5 — Statut (optionnel, coché "Actif" par défaut)

- Cases à cocher : Actif / Fermé / Tous
- Par défaut : Actif uniquement

#### Champ 6 — Forme juridique (optionnel, filtre avancé)

- Sélection multiple parmi les formes principales :
  - SARL / EURL
  - SAS / SASU
  - SA
  - Auto-entrepreneur / EI / EIRL
  - Association (loi 1901)
  - Autre
- Masqué par défaut, accessible via "Filtres avancés ▾"

### 4.2 Lancement de la recherche

- Bouton "Rechercher" actif dès qu'au moins le champ Secteur est renseigné
- Raccourci clavier : Entrée depuis n'importe quel champ
- Indicateur de chargement pendant la requête (spinner + message "Recherche en cours...")
- Temps de réponse cible : < 3 secondes

### 4.3 Gestion des erreurs de recherche

| Situation | Message affiché |
|---|---|
| API indisponible | "Les données sont temporairement indisponibles. Réessaie dans quelques instants." |
| Aucun résultat | "Aucune entreprise trouvée pour ces critères. Essaie d'élargir ta zone ou ta sélection NAF." |
| Quota gratuit atteint | "Tu as atteint la limite de ton plan gratuit. Passe au plan Solo pour continuer." |
| Erreur réseau | "Problème de connexion. Vérifie ta connexion internet et réessaie." |

---

## 5. Affichage des résultats

### 5.1 En-tête des résultats

```
[247 entreprises trouvées]  [Trier par : Date de création ▾]
[☐ Tout sélectionner]  [Exporter la sélection (0)]  [Sauvegarder la liste]
```

- Nombre de résultats affiché en temps réel
- Tri disponible : Date de création (défaut : plus récent), Effectif (croissant/décroissant), Nom (A-Z)
- Compteur de sélection mis à jour dynamiquement

### 5.2 Carte entreprise

Chaque résultat est affiché sous forme de carte avec :

```
☐  [Nom de l'entreprise]                    [Ville, Département]
   [Code NAF] — [Libellé NAF]
   [Tranche effectif]  |  Créée le [JJ/MM/AAAA]  |  SIREN : [123456789]
   Forme juridique : [SAS]  |  Statut : [Actif ✓]
   [Voir sur Pappers ↗]  [Voir sur Société.com ↗]  [+ Note]
```

**Données affichées par carte :**
- Dénomination sociale (nom légal)
- Ville + département
- Code NAF + libellé complet
- Tranche d'effectif (libellé lisible, pas le code brut)
- Date de création (format JJ/MM/AAAA)
- SIREN
- Forme juridique
- Statut actif / fermé (badge coloré : vert / rouge)
- Liens externes : Pappers, Société.com (ouverture dans un nouvel onglet)

**Données non affichées (disponibles dans l'export) :**
- SIRET du siège
- Adresse complète (numéro, rue, CP, ville)
- Code commune INSEE

### 5.3 Pagination

- 25 résultats par page (défaut)
- Navigation : Précédent / Numéros de page / Suivant
- Option "50 par page" et "100 par page" pour les plans payants
- Plan gratuit : limité à la première page (20 résultats max)

### 5.4 Sélection

- Case à cocher par carte
- "Tout sélectionner" sélectionne tous les résultats de la page courante
- "Tout sélectionner (toutes les pages)" disponible pour les plans payants (max 500 en Solo, illimité en Pro)
- Compteur de sélection visible en permanence dans l'en-tête

---

## 6. Listes & sauvegarde

### 6.1 Création d'une liste

**Déclencheur :** clic sur "Sauvegarder la liste" depuis la page de résultats.

**Comportement :**
- Modal avec champ "Nom de la liste" (obligatoire, max 80 caractères)
- Suggestion automatique basée sur les critères : "Agences web — Paris — Mai 2026"
- Option : sauvegarder tous les résultats OU seulement la sélection courante
- Confirmation → redirection vers la liste créée

**Limites par plan :**
- Gratuit : 1 liste max, 20 entreprises max par liste
- Solo : 10 listes max, 500 entreprises max par liste
- Pro : illimité

### 6.2 Page "Mes listes" (`/lists`)

Affichage en tableau :

| Nom | Entreprises | Créée le | Dernière modif. | Actions |
|---|---|---|---|---|
| Agences web Paris | 47 | 10/05/2026 | 10/05/2026 | Ouvrir / Exporter / Renommer / Supprimer |

- Tri par date de création ou de modification
- Recherche dans les noms de listes
- Suppression avec confirmation ("Supprimer cette liste ? Cette action est irréversible.")

### 6.3 Vue d'une liste (`/lists/:id`)

- Affichage des entreprises de la liste avec les mêmes cartes que la page résultats
- Possibilité d'ajouter des entreprises depuis une nouvelle recherche
- Possibilité de retirer des entreprises de la liste
- Filtres sur la liste : par statut d'annotation, par date d'ajout
- Bouton "Exporter la liste complète"
- Bouton "Lancer une alerte sur ces critères" (V2)

### 6.4 Ajout à une liste existante

Depuis la page de résultats, après sélection :
- Bouton "Ajouter à une liste existante" → dropdown des listes existantes
- Si l'entreprise est déjà dans la liste : message "X entreprises déjà présentes, Y ajoutées"

---

## 7. Annotations & statuts

### 7.1 Statuts

Chaque entreprise dans une liste peut avoir un statut :

| Statut | Couleur | Description |
|---|---|---|
| Non traité | Gris | Défaut |
| À contacter | Bleu | Priorité de prospection |
| En cours | Orange | Contact initié |
| Intéressant | Vert | Réponse positive |
| Pas pertinent | Rouge | À exclure |
| Archivé | Gris foncé | Traité, à ne plus afficher |

- Changement de statut en un clic depuis la carte
- Filtre par statut dans la vue liste
- Le statut est lié à l'entreprise dans une liste spécifique (pas global)

### 7.2 Notes

- Champ texte libre par entreprise dans une liste (max 500 caractères)
- Sauvegarde automatique (debounce 1 seconde)
- Affichage condensé sur la carte (50 premiers caractères + "...")
- Affichage complet au survol ou en mode détail

### 7.3 Priorité

- Système d'étoile simple : ☆ / ★ (non prioritaire / prioritaire)
- Tri "Prioritaires en premier" disponible dans la vue liste

---

## 8. Export

### 8.1 Export CSV

**Déclencheur :** bouton "Exporter" depuis la page résultats (sélection) ou depuis une liste.

**Colonnes du CSV exporté :**

```
siren, siret_siege, denomination, adresse_numero, adresse_voie, 
code_postal, ville, departement, region, code_naf, libelle_naf, 
tranche_effectif, date_creation, forme_juridique, statut, 
statut_annotation, note, priorite, date_ajout_liste
```

**Comportement :**
- Téléchargement immédiat (pas d'email)
- Nom du fichier : `prospectnaf_[nom-liste]_[YYYYMMDD].csv`
- Encodage : UTF-8 avec BOM (compatibilité Excel)
- Séparateur : virgule (option point-virgule dans les paramètres du compte)
- Valeurs vides : cellule vide (pas de "N/A" ou "null")

**Limites par plan :**
- Gratuit : export désactivé
- Solo : export illimité (max 500 lignes par export)
- Pro : export illimité (pas de limite de lignes)

### 8.2 Copie presse-papier

- Bouton "Copier" disponible sur chaque carte individuelle
- Copie le nom + adresse + SIREN en format texte simple
- Feedback visuel : "Copié ✓" pendant 2 secondes

### 8.3 Historique des exports (V2)

- Page `/exports` listant tous les exports effectués
- Colonnes : date, nom de la liste, nombre de lignes, re-téléchargement disponible 7 jours

---

## 9. Plans & limites

### 9.1 Définition des plans

| Fonctionnalité | Gratuit | Solo (19€/mois) | Pro (39€/mois) |
|---|---|---|---|
| Recherches / jour | 3 | Illimité | Illimité |
| Résultats / recherche | 20 | 500 | Illimité |
| Export CSV | ✗ | ✓ (500 lignes max) | ✓ (illimité) |
| Listes sauvegardées | 1 | 10 | Illimité |
| Entreprises / liste | 20 | 500 | Illimité |
| Annotations & statuts | ✗ | ✓ | ✓ |
| Filtres avancés | ✗ | ✓ | ✓ |
| Watchlists (V2) | ✗ | 1 | Illimité |
| Alertes email (V2) | ✗ | ✓ | ✓ |
| Support | Email | Email | Email prioritaire |

### 9.2 Gestion des limites

**Comportement quand une limite est atteinte :**
- Affichage d'un bandeau non-bloquant : "Tu as atteint X/3 recherches aujourd'hui."
- À la limite : modal d'upgrade avec le bénéfice concret mis en avant
- Pas de coupure brutale sans avertissement préalable

**Compteurs réinitialisés :**
- Recherches / jour : minuit UTC
- Pas de rollover (les recherches non utilisées ne s'accumulent pas)

### 9.3 Période d'essai

- Plan Solo : 14 jours d'essai gratuit sans CB requise
- À la fin de l'essai : downgrade automatique vers Gratuit si pas de paiement
- Email de rappel à J-3 et J-1 avant la fin de l'essai

---

## 10. Paiement (Stripe)

### 10.1 Flux de souscription

1. Utilisateur clique "Passer au plan Solo/Pro"
2. Redirection vers Stripe Checkout (hosted page)
3. Saisie CB + confirmation
4. Retour sur ProspectNAF avec confirmation d'activation
5. Email de confirmation avec récapitulatif

### 10.2 Gestion de l'abonnement

- Tout géré via le portail client Stripe (accessible depuis `/account`)
- Changement de plan : effectif immédiatement (prorata calculé par Stripe)
- Résiliation : effective à la fin de la période en cours
- Échec de paiement : email automatique Stripe + 3 tentatives sur 7 jours → downgrade vers Gratuit

### 10.3 Facturation

- Facture PDF générée automatiquement par Stripe
- Accessible depuis le portail Stripe
- Mention légale française sur les factures (TVA 20%)

---

## 11. Watchlists & alertes (V2)

### 11.1 Création d'une watchlist

**Déclencheur :** depuis une liste sauvegardée → "Activer les alertes sur ces critères"

**Comportement :**
- Les critères de la recherche d'origine sont sauvegardés (NAF, localisation, effectif, date création)
- Fréquence configurable : hebdomadaire (défaut) ou mensuelle
- Jour d'envoi configurable (défaut : lundi matin)

### 11.2 Email d'alerte

**Contenu de l'email :**
- Objet : "ProspectNAF — X nouvelles entreprises cette semaine pour [nom watchlist]"
- Liste des nouvelles entreprises avec : nom, ville, NAF, effectif, date création
- Bouton "Voir et ajouter à ma liste" → redirection vers ProspectNAF
- Lien de désactivation de l'alerte en bas d'email

**Règle de déduplication :**
- Une entreprise déjà présente dans la liste liée n'est pas renvoyée en alerte
- Une entreprise déjà envoyée dans une alerte précédente n'est pas renvoyée

### 11.3 Gestion des watchlists

Page `/watchlists` :
- Liste des watchlists actives avec critères résumés
- Activation / désactivation
- Modification de la fréquence
- Suppression

---

## 12. Intégrations (V3)

### 12.1 Export vers CRM

**Intégrations prévues (V3) :**
- HubSpot : création de contacts / entreprises via API HubSpot
- Airtable : ajout de lignes dans une base existante
- Notion : ajout dans une base de données Notion
- Zapier : webhook générique pour toutes les autres intégrations

**Comportement :**
- Configuration de l'intégration dans `/account/integrations`
- Sélection du mapping des champs (champ ProspectNAF → champ CRM)
- Export déclenché manuellement depuis une liste (pas d'export automatique dans V3)

### 12.2 Import de liste existante (V3)

- Import CSV d'une liste de SIREN pour enrichissement avec les données Sirene
- Cas d'usage : "J'ai déjà une liste de clients, je veux la compléter avec les données publiques"

---

## 13. API publique (V3)

### 13.1 Endpoints prévus

```
GET  /api/v1/search
     ?naf=6201Z&localisation=75&effectif=11-50&limit=100&page=1

GET  /api/v1/companies/:siren

GET  /api/v1/lists
POST /api/v1/lists
GET  /api/v1/lists/:id
POST /api/v1/lists/:id/companies
```

### 13.2 Authentification API

- Clé API générée depuis `/account/api`
- Transmission via header `Authorization: Bearer <api_key>`
- Rate limiting : 100 requêtes / minute (plan Pro), 1000 / minute (plan Agence)

---

## 14. Données & sources

### 14.1 Source principale

**API Recherche d'Entreprises (api.gouv.fr)**
- URL : `https://recherche-entreprises.api.gouv.fr/search`
- Données : SIREN, SIRET, dénomination, adresse, NAF, effectif, date création, forme juridique, statut
- Mise à jour : quotidienne
- Quota : à vérifier selon les conditions d'utilisation en vigueur

### 14.2 Stratégie de cache

- Cache des résultats de recherche : 24h (les données Sirene ne changent pas en temps réel)
- Cache des données entreprise individuelle : 7 jours
- Invalidation manuelle possible depuis l'admin

### 14.3 Fallback — Base Sirene locale

En cas d'indisponibilité de l'API ou de dépassement de quota :
- Utilisation du fichier Sirene téléchargeable (CSV mensuel INSEE)
- Hébergé en base de données locale (PostgreSQL)
- Mise à jour mensuelle automatisée
- Indicateur "Données mises à jour le [date]" visible dans l'interface

### 14.4 Transparence sur les données

- Mention visible dans l'interface : "Données issues du registre national Sirene (INSEE) — Mise à jour quotidienne"
- Page `/data` expliquant les sources, la fraîcheur et les limites des données
- Avertissement sur les champs potentiellement incomplets (effectif, notamment)

---

## 15. Règles métier

### 15.1 Recherche

- Une recherche sans code NAF n'est pas autorisée (champ obligatoire)
- La combinaison de plusieurs codes NAF est une union (OR), pas une intersection
- La combinaison de plusieurs zones géographiques est une union (OR)
- Les filtres effectif et date création sont des intersections (AND) avec les autres critères
- Les entreprises fermées sont exclues par défaut

### 15.2 Listes

- Une entreprise (identifiée par son SIREN) ne peut apparaître qu'une seule fois dans une liste
- Une même entreprise peut être dans plusieurs listes différentes
- La suppression d'une liste est irréversible
- Le renommage d'une liste ne modifie pas son contenu

### 15.3 Annotations

- Les annotations (statut, note, priorité) sont liées à l'entreprise dans le contexte d'une liste spécifique
- Si la même entreprise est dans deux listes, ses annotations sont indépendantes dans chaque liste
- Les annotations sont incluses dans l'export CSV

### 15.4 Limites et quotas

- Les limites sont vérifiées côté serveur (pas seulement côté client)
- Un utilisateur ne peut pas contourner les limites via l'API
- Les compteurs de recherche sont par utilisateur, pas par session

---

## 16. Non-fonctionnel

### 16.1 Performance

| Métrique | Cible |
|---|---|
| Temps de réponse recherche | < 3 secondes (P95) |
| Temps de chargement page | < 2 secondes (LCP) |
| Disponibilité | 99.5% (hors maintenance planifiée) |
| Temps de génération export CSV | < 5 secondes pour 500 lignes |

### 16.2 Sécurité

- HTTPS obligatoire sur toutes les routes
- Mots de passe hashés (bcrypt, coût 12)
- Tokens JWT avec expiration 24h (refresh token 30 jours)
- Rate limiting sur les endpoints d'auth : 10 tentatives / 15 minutes par IP
- Pas de stockage de données de paiement (tout délégué à Stripe)
- Headers de sécurité : CSP, HSTS, X-Frame-Options

### 16.3 RGPD

- Données personnelles collectées : email, prénom (optionnel), données de paiement (Stripe)
- Les données Sirene sont des données publiques — pas de problème RGPD sur ce point
- Droit à l'effacement : suppression de compte supprime toutes les données utilisateur
- Pas de revente de données utilisateur
- Cookies : uniquement fonctionnels et analytiques (avec consentement)
- Politique de confidentialité et CGU accessibles depuis le footer

### 16.4 Accessibilité

- Conformité WCAG 2.1 niveau AA visée
- Navigation clavier complète
- Contrastes de couleurs conformes
- Labels ARIA sur tous les éléments interactifs
- Messages d'erreur associés aux champs de formulaire

### 16.5 Compatibilité navigateurs

- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Pas de support IE11
- Responsive : desktop prioritaire, mobile fonctionnel (pas optimisé dans le MVP)

---

## 17. Glossaire

| Terme | Définition |
|---|---|
| NAF | Nomenclature des Activités Françaises — code à 5 caractères identifiant le secteur d'activité d'une entreprise |
| APE | Activité Principale Exercée — synonyme courant de code NAF |
| SIREN | Identifiant unique d'une entreprise (9 chiffres) |
| SIRET | Identifiant d'un établissement (SIREN + 5 chiffres) |
| Sirene | Système Informatique pour le Répertoire des ENtreprises et leurs Établissements (base INSEE) |
| ICP | Ideal Customer Profile — profil de client idéal |
| Tranche d'effectif | Code INSEE représentant une fourchette du nombre de salariés |
| Watchlist | Recherche sauvegardée avec alertes automatiques sur les nouvelles entreprises correspondantes |
| Liste | Collection d'entreprises sauvegardées par l'utilisateur avec annotations |
| Annotation | Note, statut ou priorité ajoutés par l'utilisateur sur une entreprise dans une liste |
