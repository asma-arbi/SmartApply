# SmartApply — Front (Next.js)

Interface des entretiens. Le CRUD passe par des server actions Next.js, qui écrivent dans MongoDB Atlas. Le serveur NestJS n’est plus utilisé pour ces opérations.

## Lancer

```bash
cp .env.example .env.local
# collez votre MONGODB_URI dans .env.local
npm install
npm run dev
```

Ouvrez `http://localhost:5173`.

Au premier appel (`SEED` différent de `false` et base vide), un jeu de démo Expensya est inséré.

Le sélecteur de rôle en haut envoie l’utilisateur courant aux server actions :

- Entreprise : Ines Ben Salem (Expensya) — crée, modifie, évalue, supprime
- Candidat : Mohamed Trabelsi — voit ses entretiens et répond
- Admin : voit tous les entretiens
