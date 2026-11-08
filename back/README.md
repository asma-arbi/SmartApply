# SmartApply — API NestJS (MongoDB Atlas)

CRUD des entretiens. Toutes les écritures passent par NestJS et sont stockées dans MongoDB Atlas.

## Préparer Atlas

1. Créez un cluster gratuit sur [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Database Access : un utilisateur avec mot de passe.
3. Network Access : autorisez votre IP (ou `0.0.0.0/0` en développement).
4. Connect → Drivers : copiez la chaîne `mongodb+srv://...`.

## Lancer

```bash
cp .env.example .env
# collez votre MONGODB_URI dans .env
npm install
npm start
```

L’API écoute sur `http://localhost:4000`.

Au premier démarrage (`SEED=true` et base vide), un jeu de démo Expensya est inséré : candidatures, recruteurs, 3 entretiens, 1 évaluation.

## Routes

| Méthode | Route | Action |
| --- | --- | --- |
| GET | `/api/v1/health` | Connexion OK |
| GET | `/api/v1/applications` | Candidatures éligibles |
| GET | `/api/v1/interviewers` | Recruteurs de l’entreprise |
| GET | `/api/v1/interviews` | Liste |
| GET | `/api/v1/interviews/:id` | Détail |
| POST | `/api/v1/applications/:applicationId/interviews` | Créer |
| PATCH | `/api/v1/interviews/:id` | Modifier, reporter, annuler, clôturer |
| POST | `/api/v1/interviews/:id/respond` | Réponse du candidat |
| POST | `/api/v1/interviews/:id/evaluation` | Grille d’évaluation |
| GET | `/api/v1/interviews/:id/evaluations` | Liste des évaluations |
| DELETE | `/api/v1/interviews/:id` | Supprimer |

Le front envoie l’utilisateur courant dans les en-têtes `x-user-id`, `x-user-role`, `x-user-name`, `x-user-email`, `x-company-id`, `x-company-name`.

Collections Atlas : `interviews`, `evaluations`, `applications`, `interviewers`.
