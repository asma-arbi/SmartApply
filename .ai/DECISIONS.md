# Decisions
- Asma app is the base. Original authentication, registration, Google chooser, account/admin/company features and dashboard sources must stay byte-identical; only new module links/configuration are added.
- Keep Next14/React18. Adapt copied React19 action hooks/client dispatcher rather than upgrading her app.
- Original Asma sessions are the single identity issuer. Added adapter checks signature, session ownership, expiration/revocation and current user role. Trusted authenticatedSession is distinct from actual emailVerified; no new email gate or fabricated verification.
- Reuse original Atlas smartapply database/user IDs; no reset/import/password migration. New professional records initialize her existing candidate facts without editing account-profile actions.
- Module CRUD uses Server Actions; namespaced Nest endpoints handle private files, analysis, AI and workflows. Nest login/account/OAuth controllers are not mounted in Asma mode.
- Module CSS and private cache exclusion are scoped. Her recovery page gets only a surrounding Suspense layout for production compatibility; original page code stays unchanged.


## 2026-11-08 — Posts interface adaptation
Keep Next14/React18, existing shell/styles, session adapter and Mongo connection; adapt reference Posts behavior rather than copying its Next16/auth application. User explicitly required preserving SmartApply-cv architecture and design. Media stays in the existing DB behind an authenticated Server Action and visibility-controlled route (4MiB cap), avoiding a new storage service. Browser regression uses mocked actions because no isolated mongod executable is present; do not equate it with live session/Mongo verification.
