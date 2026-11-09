# SmartApply — current state (2026-11-09)

Canonical checkout: `C:/Users/moham/Desktop/project pwa/intgration/SmartApply`. Next14/React18; original Asma sessions retained. Preserve existing auth/admin/company/Posts/CV features. Preserve local secrets; never print credentials.

## Workflows
See WORKFLOWS.md for routes/setup/tests. /jobs retains candidate dashboard navigation; filters/saved offers use Mongo. Four-step application uses selected private CV and saved letter version. Company dashboard links to /dashboard/company/applications with dossiers, exact submitted CV/letter, company-private notes, shortlist/reject/interview scheduling. SHORTLISTED/recruitment decisions are recruiter-only; candidates may withdraw. Application-scoped CV route enforces ownership. Africa/Tunis times. Interview pages share overview/list/month calendar, real counts, filters, details/iCal and existing recruiter scheduling. See HANDOFF for verification.

Messaging polls every8seconds; no WebSocket/calls/attachments. SWv3 caches only four public offline assets: old HTML/RSC caching caused mixed-account identities. Private HTML/RSC/API never cached; login/logout invalidate dashboard layout. Active-SW company/candidate switch regression passed. Dev uses .next-cv-dev-v3 and disables Webpack disk cache after Windows UNKNOWN/EPERM. Duplicate launcher guard checks ports3030/4300.

## AI modules
Letters always use the versioned skill/PDF-structure prompt; only selected reviewed CV + confirmed supplements are evidence. Grounded tech/numeric checks and one corrective retry preserve failed drafts. See WORKFLOWS.md.

Matching IA uses owned reviewed CV + Groq against published internal offers, bounded retrieval and evidence validation; coverage is not hiring probability. Private results persist in candidate_ai_jobs; filters/favorites use live offers. See WORKFLOWS.md.

## Posts
Feed and personal/company MyPosts now share compact social cards and modal composer (image/video/PDF/poll/event/article, emoji/tags, drafts/Tunis scheduling). Persist reactions/replies/reposts/bookmarks and ownership controls. Short/media-only posts, repost media edits and PDF names fixed. Test results in HANDOFF; existing polling/WS retained.

## Data and checks
Demo seed preserves8 accounts,45 offers,15 applications,30 messages. Local passwords in Git-ignored .demo-credentials.json. Source offers and seed under scripts/demo-data and scripts/seed-workflows.mjs. No external mail.

Clean deploy branch excludes secret-bearing ancestry; DEPLOYMENT.md covers Vercel frontend + Render worker. Checks in HANDOFF. Preservation check blocked by absent .module-backup/original-files.json. Node22+ required. context-check available; no graph. Earlier Posts context: .ai/archive/2026-11-08-posts-state.md (load only for Posts).
