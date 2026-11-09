# Your CV/profile/letter modules inside Asma’s application

Start from this folder, not the parent project:

```powershell
cd "C:\Users\MOHAMED AMINE\Desktop\SmartApply-cv"
npm run dev:modules
```

This starts her Next14 app on localhost:3030 and the added Nest service on127.0.0.1:4300. Her existing npm run dev command remains unchanged, but it starts only Next; use dev:modules when testing CV analysis/private files/letter commands. The launcher defaults to port3030 to avoid collisions with the separate SmartApply-posts app on3000. Set `$env:MODULE_WEB_PORT='3040'` to choose another free port. Do not start a second server on the same port.

Register/login normally through her original screens. Her original candidate dashboard remains. The new sidebar links are:

- Mon CV: upload/list/replace/primary/delete private PDF/DOCX up to5MB; preview and reviewed AI analysis.
- Mon profil professionnel: experience, education, skills and projects.
- Mes lettres de motivation: French/English drafts, AI generation, fallback templates, manual edits, immutable version history/restoration and print/copy.
- Matching IA / Entretiens: explicit À intégrer pages for now.

The original Mon Profil & Paramètres, Déconnexion, administrator/company features and Google chooser have not been replaced. New accounts go directly from her registration flow to her dashboard/modules without a second login or a newly imposed email-verification step. Her Google chooser retains its existing demo behavior; this integration does not reclassify it as verified Google OAuth.

## Connection and ownership

Original app/actions.ts, lib/auth/session.ts and auth pages remain the sole user-management implementation. The added module verifies the same signed cookies/session records, checks current account role and binds data to the original user ID. No Nest authentication issuer, account registration or CAPTCHA validation is mounted in module mode. MongoDB database remains smartapply on her configured Atlas cluster. The existing root .env is unchanged; the added backend/.env contains only copied existing Groq settings. The launcher supplies her DB/session configuration to the module backend server-side.

CRUD uses Next.js Server Actions under cv-module/actions. Nest handles private file access, reviewed extraction, analysis jobs, AI generation, templates and workflow commands through same-origin /api/cv-module. Module Swagger is /module-docs. The shared repositories preserve version conflicts, immutable application attachments and referenced deletion blocks. No Supabase service is used for these modules.

New module CSS is scoped to .cv-module; her dashboard/auth typography and layout stay unchanged. A service-worker exclusion applies only to the added private module URLs. These pages/files/results are not cached offline.

## Test

```powershell
npm run test:preservation
npm run test:modules
npm run typecheck:modules
npm run test:modules:e2e
npm run build:modules
```

Preservation compares the original file hashes captured before module integration. Only additive dependency/config wiring, sidebar links and optional breadcrumb labels are allowed to change among original app/lib files. Root login, registration, auth session, Google chooser, dashboard, settings, admin and company screens must match their original bytes.

The browser test uses a temporary local Mongo replica set and fictional accounts. It creates a new account using her real registration form, reaches her original dashboard, opens/uploads/previews CVs, edits the professional profile, creates FR/EN template letters, saves/restores versions, logs out and checks private-route rejection. It also checks the original Google chooser. No real Atlas accounts or SMTP emails are created by browser tests.

Existing CV/profile/letter records are reused by original user ID; there is no database reset or account/password migration. First-time professional module profiles initialize from the candidate’s existing Asma name/city/skills without changing her account settings.

## Delivery verification (2026-11-08)

Passed: original-file preservation,9 session adapter tests, frontend/backend types, two full browser scenarios and Next14 production build. Browser checks include cross-account private-file denial, analysis preview and responsive widths320/390/768/1024/1440. Live Atlas/Groq check separately completed analysis and French/English AI letters with cleanup of all generated fictional records. No real SMTP email or Google OAuth provider test was performed.

The original forgot-password page has an added surrounding Suspense layout for production compatibility; its code/flow remains unchanged. The original logout returns to the public homepage. Current local demonstration is http://localhost:3030 with Nest on4300.

## CV-grounded letter generation

In Mes lettres select a CV, enter a target position (or a specific application title), click **Préparer le texte du CV**, review/edit the redacted text, confirm consent, then click **Générer avec l’IA**. Company, job description and highlights are optional. The preview uses the owned file; generation binds its hash and saves the reviewed text with the job. Invalid or placeholder-containing output is rejected and the draft remains intact. The letter-generation API now requires approvedText and sourceHash as well as version and consent.

The AI is instructed to ground claims in the reviewed CV and confirmed profile. Placeholder and unsupported-number checks cannot guarantee that every semantic claim is true; candidates should review letters before use. French and English live generation completed with fictional test data after signature redaction markers were restored from confirmed profile data.

## Publications intégrées à la page des offres

La page d’accueil `/` affiche maintenant les offres suivies d’un fil public de publications, lu dans la même base MongoDB Atlas `smartapply` par la connexion partagée. La gestion des posts et des interactions reste portée par les Server Actions; les collections sont `posts`, `post_reactions`, `post_comments`, `post_bookmarks` et `post_reports`. La page `Mes publications` est disponible depuis les menus candidat et entreprise.

En mode local, lancer `npm run dev:modules` pour démarrer aussi NestJS, requis pour les notifications WebSocket des commentaires. Le navigateur ouvre le canal `/api/posts/ws` sur le port défini par `NEXT_PUBLIC_POSTS_WS_PORT` (4300 par défaut). Les commentaires sont écrits dans MongoDB avant l’émission d’un événement; les autres sessions authentifiées rafraîchissent alors les commentaires. Le serveur Nest vérifie l’origine et la session SmartApply. Le launcher génère un secret interne temporaire pour relier les Server Actions au service Nest. En déploiement, définir le même `POSTS_REALTIME_SECRET` côté Next et Nest, exposer le WebSocket Nest sur l’origine configurée par `NEXT_PUBLIC_POSTS_WS_URL`, et conserver `MONGODB_URI`/`MONGODB_DB` sur la base existante. Si Nest est indisponible, les données sont conservées, mais la notification temps réel ne part pas.




## Posts interface adaptation (2026-11-08, SmartApply-cv checkout)

The reference SmartApply-posts application supplies UI patterns only. SmartApply-cv retains Next14/React18, original login/session, shared Mongo DB and dashboard shell. Posts composer/feed use existing module cards/colors, adapted to candidate/recruiter permissions. Feed entry `/dashboard/posts`; management `?view=mine`; company `/dashboard/company/posts`; moderation `/dashboard/admin/posts`; public details `/posts/[id]`.

New options: modal composer with content/media/settings sections, article format, quick categories, saved-feed view, progressive loading, six reactions, poll voting/results, hide/repost/share, pin/comment controls, publish-now and scheduling cancellation, company job details and own-post interaction counts. Company role comes from server identity, independent of whether it already has jobs/posts. Title can be omitted. Dates selected locally are submitted as ISO timestamps.

`uploadPostMedia(FormData)` stores allowed files up to4MiB in the same database's `post_media` collection. MIME/signature checks reject unsupported formats. `/api/posts/media/[id]` requires ownership or a published post visible to the viewer; cache is private/no-store. Supported: JPEG/PNG/GIF/WebP, MP4/WebM, PDF. Server Actions verify ownership of local media references. No external service or new login is required. Abandoned uploads are not garbage-collected.

Additional collections `post_votes`, `post_hidden` and `post_comment_reactions` support polls and personal hiding. Scheduling remains request-driven, not a background worker. Reposts copy a snapshot. Nested replies, comment reactions and owner-only comment editing/deletion are supported. Existing websocket server was not changed or live-tested.

Verification: `node --test cv-module/tests/posts-actions.node.cjs` (11 isolated tests, mocked identity/collections); `node scripts/test-posts-ui.cjs` (real Edge UI with mocked Server Actions, role forms and responsive widths320/390/768/1440). UI screenshots in `output/posts-review`. Neither suite proves real Mongo/session integration. Frontend TypeScript and Next production build pass; jose Edge warnings pre-exist. Preservation check cannot run without `.module-backup/original-files.json`; local mongod is absent. No real account or Atlas records were created by these checks.
