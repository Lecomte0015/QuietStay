# QuietStay Ops 🏠

> Dashboard propriétaire de conciergerie immobilière courte durée — Suisse

## Aperçu

QuietStay Ops centralise la gestion des réservations, logements, ménages, propriétaires, accès et facturation pour une conciergerie immobilière opérant sur le marché suisse de la location courte durée (Airbnb, Booking.com, direct).

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Next.js 14 |
| UI | Tailwind CSS + Lucide Icons |
| Backend | Supabase (Auth, PostgreSQL, RLS, Realtime) |
| Déploiement | Vercel / Cloudflare Pages |

## Structure du projet

```
quietstay-ops/
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/
│   │   ├── ui/                 # Composants UI réutilisables
│   │   ├── layout/             # Sidebar, Header, Layout
│   │   ├── dashboard/          # Widgets KPI, mouvements
│   │   ├── properties/         # Cartes logements, détails
│   │   ├── bookings/           # Tableau, timeline
│   │   ├── cleanings/          # Checklist, photos, validation
│   │   ├── owners/             # Fiches propriétaires
│   │   ├── invoices/           # Tableau facturation
│   │   └── settings/           # Paramètres entreprise
│   ├── hooks/
│   │   └── useSupabase.ts      # Hooks CRUD + realtime
│   ├── lib/
│   │   ├── supabase.ts         # Client Supabase
│   │   └── utils.ts            # Helpers, formatters, constantes
│   └── types/
│       └── index.ts            # Types TypeScript
├── supabase/
│   ├── migrations/
│   │   └── 001_schema.sql      # Schéma complet + RLS + triggers
│   └── seed/
│       └── seed.sql            # Données de test
└── README.md
```

## Installation rapide

### 1. Prérequis

- Node.js 18+
- Compte [Supabase](https://supabase.com) (gratuit)

### 2. Créer le projet Supabase

1. Créer un nouveau projet sur [app.supabase.com](https://app.supabase.com)
2. Aller dans **SQL Editor**
3. Exécuter le fichier `supabase/migrations/001_schema.sql`
4. Exécuter le fichier `supabase/seed/seed.sql` pour les données de test

### 3. Installer le frontend

```bash
# Cloner et installer
git clone <repo-url> quietstay-ops
cd quietstay-ops
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
```

Éditer `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon
```

Ces valeurs se trouvent dans **Supabase → Settings → API**.

```bash
# Lancer en développement
npm run dev
```

### 4. Créer un utilisateur admin

Dans le SQL Editor Supabase :

```sql
-- Après avoir créé un compte via l'interface Auth
UPDATE public.profiles SET role = 'admin' WHERE email = 'votre-email@example.com';
```

## Architecture de la base de données

### Tables principales

| Table | Description |
|-------|-------------|
| `profiles` | Extension Supabase Auth (rôle, nom, téléphone) |
| `owners` | Propriétaires des logements |
| `properties` | Logements gérés (adresse, type, capacité) |
| `bookings` | Réservations (plateforme, dates, voyageur, montant) |
| `cleanings` | Ménages (checklist, photos, validation) |
| `accesses` | Codes d'accès et clés par logement |
| `invoices` | Factures mensuelles propriétaires |
| `activity_logs` | Journal d'activité |

### Row Level Security (RLS)

Trois niveaux d'accès stricts :

| Rôle | Accès |
|------|-------|
| **admin** | Lecture + écriture complète sur toutes les tables |
| **staff** | Lecture + écriture sur `bookings` et `cleanings`, lecture seule sur le reste |
| **owner** | Lecture seule de **ses propres données** uniquement |

> ⚠️ Aucun accès cross-owner n'est possible grâce aux policies RLS.

### Logique métier automatisée

1. **Ménage automatique** : Un `cleaning` est créé automatiquement à chaque nouvelle réservation (trigger `auto_cleaning_on_booking`)
2. **Factures mensuelles** : Fonction `generate_monthly_invoices(year, month)` qui agrège les revenus par propriétaire
3. **Vue mouvements** : `today_movements` fournit les arrivées/départs du jour avec les accès

## Écrans

| # | Écran | Description |
|---|-------|-------------|
| 1 | **Login** | Authentification Supabase |
| 2 | **Dashboard** | KPIs, arrivées/départs, ménages à traiter, répartition plateformes |
| 3 | **Logements** | Cartes avec statut, accès, réservations récentes |
| 4 | **Réservations** | Tableau filtrable + timeline visuelle 14 jours |
| 5 | **Ménages** | Checklist interactif, upload photos, validation |
| 6 | **Propriétaires** | Fiches avec logements, factures, IBAN |
| 7 | **Facturation** | Tableau récapitulatif, génération mensuelle |
| 8 | **Paramètres** | Entreprise, commissions, équipe |

## Décisions de conception

- **Supabase Auth + RLS** : La sécurité est au niveau base de données, pas applicatif. Même un accès API direct est protégé.
- **Triggers PostgreSQL** : La logique métier critique (création ménage, mise à jour timestamps) est dans la DB pour garantir la cohérence.
- **Pas de framework CSS externe** : Tailwind CSS natif pour un contrôle total et une taille de bundle minimale.
- **Données locales dans le prototype** : Le fichier `.jsx` fonctionne avec des données mock pour une démo immédiate, les hooks Supabase sont prêts pour la production.
- **Commission variable** : Chaque réservation peut avoir un taux de commission différent (Airbnb vs Booking vs direct).

## Roadmap MVP+

- [ ] Upload photos Supabase Storage
- [ ] Notifications push (arrivées, ménages en retard)
- [ ] Import iCal (sync Airbnb/Booking)
- [ ] Export PDF factures
- [ ] App mobile PWA pour équipe terrain
- [ ] Tableau de bord propriétaire (portail dédié)

## Licence

Projet privé — QuietStay Sàrl
