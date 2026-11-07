# SmartApply — Posts Management

Application Next.js unifiée (front + API) pour le fil carrière Tunisie.

## Lancer

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

Créez un compte candidat depuis `/register`. Les comptes et les données de l’application sont stockés dans MongoDB. Les rôles entreprise et admin sont attribués côté base. Les anciens comptes ne sont pas transférés automatiquement ; il faut en créer de nouveaux.

Configurez `MONGODB_URI` et `AUTH_SECRET` dans `.env.local` (`AUTH_SECRET` doit contenir au moins 32 caractères).

## Design

Tous les tokens du fil (couleurs, radius, typo, layout) sont dans [`styles/theme.css`](styles/theme.css).  
Ajustez uniquement ce fichier pour changer l’apparence sans toucher aux composants.

## Priorités Posts

### Obligatoire
- Composer (texte, photo/document via URL, sondage, lien job/entreprise)
- Cartes de post + CRUD + publier / archiver
- Recherche / filtres, source Manuel / Importé
- Signalement + modération admin
- Favoris (`/saved`)

### Optionnel (feature flags — `lib/feature-flags.ts`)
| Flag | Défaut | Effet |
|------|--------|--------|
| `multiReactions` | on | J’aime / Bravo / … |
| `nestedComments` | on | Réponses à un niveau |
| `polls` | on | Sondages |
| `documents` | on | Photo / vidéo / document |
| `hide` | on | Masquer un post (local) |
| `shareCount` | on | Envoyer = copie du lien |
| `repost` | off | Republication |
| `schedule` | off | Programmer |
| `pin` | off | Épingler |
| `mentions` | off | @mentions |
| `funnyReaction` | off | Réaction FUNNY |

## Structure utile

- `app/` pages + `app/api/v1` routes REST
- `components/posts/` composer, cartes, actions
- `server/` services métier et modèles Mongoose
- `MONGODB_URI` : connexion MongoDB
- `AUTH_SECRET` : secret de signature des sessions (32 caractères minimum)

## Intégrations coéquipiers

- **Jobs (Fares)** : `jobId` → `catalog_jobs`
- **Entreprises** : `companyId` → `catalog_companies` (vérifiée pour publier une offre)
- **Auth** : rôles `CANDIDATE` / `COMPANY` / `ADMIN`
- **Lettres** : studio `/letters` (ownership proposé Ahmed) ; candidatures catalogue lues (Yosra)
- **Notifications / messagerie** : point d’intégration prévu ; Envoyer = copie du lien pour l’instant

## Conformité CDC

Sources dans [`docs/`](docs/) :
- `cahier-des-charges.txt`, `functional-reference.txt`
- Matrice module : [`docs/CDC-COMPLIANCE.md`](docs/CDC-COMPLIANCE.md)

Quotas Letter Studio (Functional Reference §9) — Free / Premium :
- Lettres : **10** / **40** par jour
- Envois : **10**/j **30**/sem · **25**/j **75**/sem
- Régénérations / candidature : **2** / **10**

Envoi démo : compose Gmail + confirmation explicite (pas OAuth Gmail API tant que les credentials ne sont pas fournis).
