# Architecture SmartApply

SmartApply is one Next.js application with a clear frontend/backend boundary inside the repository. It is not two independently deployed applications: Server Actions and shared type-safe imports rely on the Next.js runtime.

## Frontend

- `app/`: routes and page composition.
- `components/`: user interface, including candidate, company, admin, posts, network, and messaging screens.
- `hooks/`: client state and UI orchestration.
- `styles/`: shared design system.
- `public/`: static assets and uploaded media files.

## Backend

- `server/actions/`: the server entry points called by the frontend. Each action authenticates and authorizes the user before calling business logic.
- `server/services/`: domain rules and operations; no UI components.
- `server/models/`: Mongoose schemas and MongoDB collections.
- `server/lib/`: Mongo connection, authentication, validation errors, and shared server infrastructure.
- `server/schemas/`: input validation for untrusted action/API input.
- `app/api/v1/`: REST compatibility endpoints and non-UI integrations. The SmartApply UI uses Server Actions for CRUD flows.

## Data flow

```text
Frontend (app/components/hooks)
          │ Server Action call
          ▼
Backend boundary (server/actions)
          │ auth + validation
          ▼
Business logic (server/services)
          │ Mongoose
          ▼
MongoDB (server/models, MONGODB_URI)
```

User/profile/post metadata and application records are stored in MongoDB. Uploaded media bytes are written under `public/uploads/`; their URLs and profile/post references are saved in MongoDB. Local disk uploads need a persistent media volume in production.

## Advanced candidate matching

`components/candidate/job-matches-widget.tsx` and `job-matches-page.tsx` render recommendations. `server/actions/matching.actions.ts` checks the candidate session. `server/services/matching.service.ts` reads the candidate profile, published jobs, and company records from MongoDB and computes a transparent keyword score. It compares profile skills, headline, bio, education, and experience with job requirements/title (or description when requirements are empty). Results are computed on request; no synthetic records or scores are persisted.

## Database note

The active application uses MongoDB through `MONGODB_URI` and Mongoose. PostgreSQL/Supabase references in the original functional-reference documents describe the initial specification, not the current runtime implementation.
