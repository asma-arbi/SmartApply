# Candidate and recruiter workflows

Run `npm run dev:modules` with Node 22+; frontend defaults to port 3030. Existing session authentication is reused.

- `/jobs`: public offers; candidates retain dashboard navigation. Search, combined filters, ordering and saved offers use MongoDB.
- `/dashboard/candidate/applications`: candidate tracking, submitted documents and management of existing drafts/private notes.
- `/dashboard/company/applications`: received applications, dossiers, submitted CV and letter, company-private notes, shortlist/reject and interview scheduling.
- `/dashboard/messages`: application-scoped text chat, refreshed every eight seconds; no WebSocket messaging, calls or attachments.

## Demo records

`npm run seed:workflows -- --dry-run` previews the fixture without connecting. `npm run seed:workflows` uses configured `MONGODB_URI` and `MONGODB_DB` (default database: smartapply).

The seed creates 3 candidates, 5 companies, 45 offers, 15 applications and 30 messages under the `workflows-v1` demo marker. Accounts have `.test` email addresses. Passwords are random and hashed; local login details are written to `.demo-credentials.json`, ignored by Git. Repeated runs preserve existing records and passwords. Imported offer content is a demo copy of the supplied PDFs, not a verification that the employer is currently recruiting on SmartApply. Nothing is emailed externally.

`SHORTLISTED` is a recruiter-only status between submission/review and interview or rejection. Existing statuses remain valid. Application documents are served through `/api/applications/:id/cv` after checking application ownership; direct CV-library ownership remains unchanged. DOCX attachments are downloaded; PDF attachments support inline previews. Saved letter text is copied into the application at submission.

Company-private notes use `recruiter_application_notes`; candidate personal notes remain separate. Recruiters see only submitted applications for their verified companies. All interview times are displayed in Africa/Tunis, with manual meeting links.

## Verification

`npm run build:data` then `npm run test:workflows` runs isolated MongoDB authorization/privacy tests. `npm run test:workflows:browser` starts a disposable local Mongo replica set and Next server, creates fictional sessions and exercises jobs, application submission, recruiter actions, private CV access and two-session messaging. It does not write to Atlas. Browser screenshots are written to `output/workflow-review/`.

The frontend tsconfig targets ES2022 and excludes standalone backend/legacy back/front projects, which have their own configuration. Run `npm run typecheck:modules` for frontend and module backend checks.

Latest verification: five repository tests and the real-session browser workflow pass; frontend/backend TypeScript and production build pass. Existing lint warnings remain. The preservation script cannot run because its original-file baseline is absent.

## Session and offline caching

Service worker v3 caches only the public manifest, offline document and icons. It never caches HTML, RSC navigation responses, private API responses or development scripts. Offline pages show the generic offline document. Activation deletes prior SmartApply caches; a worker update reloads an already-controlled tab once to discard old router state. Login/logout invalidate the dashboard layout. `npm run test:session-cache` checks cache isolation; `npm run test:account-switch` verifies role/account switches in one disposable browser context without bypassing CAPTCHA.

## Permanent AI cover-letter policy

Every Groq letter request uses `backend/src/studio/cover-letter-prompt.ts` (version `cover-letter-skill-reference-v1`), a portable runtime adaptation of the user's `cover-letter-generator/SKILL.md`. The supplied Cover Letter PDF guides paragraph structure only; its identity, dates, institutions, technologies and metrics are not candidate evidence. The selected reviewed CV is primary; confirmed profile and explicit additional information supplement it. Company/job descriptions never establish candidate qualifications. FR/EN, company optional, tone and additional information are supported. No host skill path or Downloads file is needed at runtime.

Technology aliases such as JS/JavaScript and TS/TypeScript are recognized. Unsupported technologies, numbers and unfinished fields trigger one corrective rewrite with specific feedback; persistent failures preserve the draft. Each explicit retry after a failed job uses a fresh operation key. Provider errors still surface normally; no template is silently presented as AI output.

`npm run test:cover-letter` requires compiled backend and disposable Mongo. `npm run test:cover-letter:live` uses the configured Groq key and sends only a fictional CV to test French/English; it consumes provider quota and prints no credentials or real CV text.

## Matching IA

The sidebar opens `/dashboard/candidate/matching`. Select an owned CV, prepare/review the extracted text and consent before requesting Groq matching. Only published internal SmartApply offers from verified active companies are eligible; external, closed, archived, expired and legacy-only offers are excluded. A local CV/technology retrieval stage shortlists up to twelve offers, then Groq supplies exact evidence for up to eight recommendations. Displayed percentages are coverage of verified analyzed criteria, not hiring likelihood. Titles, skills and the first 1,200 description characters are available to the comparison; full requirements remain on the offer page.

Results and CV hash are persisted privately in candidate_ai_jobs. Matching never edits profiles or sends applications. Repeating a pending request reuses its job; explicit reruns after completion are fresh. Changed/unavailable offers are hidden on later reads. Errors preserve prior successful results. Filters, evidence details and favorites are available; CV changes clear the previous selection's view.

API: `POST /api/cv-module/matching/:cvId` with approvedText/sourceHash/consent and Idempotency-Key; `GET` same path for latest completed result; poll existing `/ai-jobs/:id`. The AI key remains on the backend. `test:matching`, `test:matching:ui` and `test:matching:live` cover persistence/authorization, React behavior and fictional-provider smoke checks.
