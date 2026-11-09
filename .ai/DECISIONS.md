# Decisions
- Asma app is the base. Original authentication, registration, Google chooser, account/admin/company features and dashboard sources must stay byte-identical; only new module links/configuration are added.
- Keep Next14/React18. Adapt copied React19 action hooks/client dispatcher rather than upgrading her app.
- Original Asma sessions are the single identity issuer. Added adapter checks signature, session ownership, expiration/revocation and current user role. Trusted authenticatedSession is distinct from actual emailVerified; no new email gate or fabricated verification.
- Reuse original Atlas smartapply database/user IDs; no reset/import/password migration. New professional records initialize her existing candidate facts without editing account-profile actions.
- Module CRUD uses Server Actions; namespaced Nest endpoints handle private files, analysis, AI and workflows. Nest login/account/OAuth controllers are not mounted in Asma mode.
- Module CSS and private cache exclusion are scoped. Her recovery page gets only a surrounding Suspense layout for production compatibility; original page code stays unchanged.


## 2026-11-08 — Posts interface adaptation
Keep Next14/React18, existing shell/styles, session adapter and Mongo connection; adapt reference Posts behavior rather than copying its Next16/auth application. User explicitly required preserving SmartApply-cv architecture and design. Media stays in the existing DB behind an authenticated Server Action and visibility-controlled route (4MiB cap), avoiding a new storage service. Browser regression uses mocked actions because no isolated mongod executable is present; do not equate it with live session/Mongo verification.

## 2026-11-09 — Session-safe offline caching
User reported wrong identities after switching accounts. Reproduction showed v2 cached personalized HTML/RSC by URL and could replay the previous account. Service worker v3 uses a public-static allowlist, never account HTML/RSC/API/dev-script caching; offline navigation gets only the generic offline page. Clear prior SmartApply caches on activation and reload controlled tabs on worker upgrade. Login/logout invalidate the dashboard layout. This narrowly changes cache invalidation in existing auth actions; credential verification, CAPTCHA and RBAC remain intact. Public offline resources remain available.

## 2026-11-09 — Permanent evidence-based letter prompt
Groq always uses a versioned portable prompt adapted from the requested cover-letter-generator skill and reference PDF structure. Do not read absolute user skill/Downloads paths at runtime or copy the PDF candidate's facts. The selected reviewed CV and confirmed supplemental information are evidence; employer requirements are not qualifications. Keep factual guards and bounded corrective feedback rather than accepting unsupported AI output. Explicit retries after a failed generation get new operation keys; network retries while pending retain idempotency. Never replace a user's draft on validation failure.

## 2026-11-09 — Internal offer matching with verifiable evidence
User chose published SmartApply offers first. Reuse selected owned CV/review/consent and Groq; no external crawler. Bound provider input using local retrieval (12 offers, 1,200 description characters), then validate returned real IDs and contextual CV/job quotes. Calculate criterion coverage on the server; never present it as hiring probability. Persist private matching jobs in the existing queue, leave prior successful results on failure, and revalidate offer availability/content before processing and viewing. No profile mutations or automatic applications.

## 2026-11-09 — Shared interview workspace
Use actual application_interviews through existing candidate/company-scoped actions for both roles. Share overview/list/calendar presentation; preserve dashboard auth and scheduling transactions. Calendar days and scheduling inputs use Africa/Tunis independently of browser timezone. Show Planifié/Passé/Annulé derived from dates/application terminal state; do not invent confirmation or evaluation data. Reuse the current scheduling form and application version conflicts. Export iCal locally; do not create Meet links.

## 2026-11-09 — Posts social workspace
Reuse Posts Server Actions/Mongo/media routes for compact feed + unified candidate/company management. Composer is modal with bounded flex scroll and fixed footer; block controls/submission until owned edit and viewer data load to prevent accidental duplicate posts/identity confusion. Uploads stay within existing4MiB authenticated storage; validate MIME against selected kind, preserve original PDF names, and permit only retained media when editing authorized repost snapshots. Keep share links/native sheet user-triggered, without sending external messages. Preserve query-triggered scheduled publishing; cancel via owner-scoped atomic unschedule transition.
