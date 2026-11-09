# Current state — 2026-11-08

## Checkout and constraints
Working checkout: `C:/Users/MOHAMED AMINE/Desktop/SmartApply-cv`. No `.git` directory or `.module-backup/original-files.json` is present here. Older notes referred to a different Asma checkout; their verification is not evidence for this copy. Preserve the existing authentication, account/Google flows, dashboard shell, CV modules and database. User explicitly requests Posts integration for candidate/company with this app's architecture and design, using `Desktop/integration pwa/SmartApply-posts` as a read-only interface reference.

Next 14.2.35 / React 18. Existing `getSessionUser` + `requireIdentity` / `asmaSession` resolve the original cookies and database user. Module roles are `candidate`, `recruiter`, `admin`; original app names include `candidat`, `entreprise`. Mongo uses `cv-module/lib/mongodb.ts` -> existing `lib/mongodb.ts` / shared data package. Never expose `.env` contents. No account, separate database, framework migration or auth system was introduced.

## Posts implementation
`cv-module/components/posts.tsx`: role-aware composer and own-post management. `posts-feed.tsx`: feed, modal composer, format shortcuts, category chips, search/company/tag/format filters, sorting, saved view and progressive loading. Styling is scoped to Posts in existing `module.css`, reusing module cards, blue actions, borders and typography; original shell remains.

Candidate publishes personally; recruiter can publish as company/personal and link only its own published jobs. Role is loaded from the server even when a company has no posts/jobs. Supported formats: text/article, image, video, PDF, poll, event, celebration, company job details. Composer sections: content, media/formats, settings. Title optional (derived for card when absent). Tags, language, urgency, pinning, visibility, comments, drafts and scheduling available. Management includes edit/delete confirmation, archive/restore, publish now, cancel scheduling, interaction counts.

`cv-module/actions/postActions.ts` implements persisted CRUD, six reaction choices, comments, bookmarks, reports, hiding, reposting and poll votes/results. Ownership derives from session; company jobs checked server-side. Private comments are excluded from unauthenticated reads. Votes/bookmarks/reactions have compound uniqueness indexes. Polls reject duplicate options and changed options after voting; edits preserve closing date. Admin reports include reported content and author, with dismiss/remove decisions.

Media imports use authenticated `uploadPostMedia` Server Action, same Mongo DB collection `post_media`, maximum 4 MiB with allowed MIME + signature validation. Images JPEG/PNG/GIF/WebP, MP4/WebM, PDF. `/api/posts/media/[id]` serves only to owner or viewers of a corresponding published post, respects member visibility and sends private/no-store. Attached local media must belong to the author when saving. External HTTPS links remain supported. No storage service was provisioned.

Routes: existing `/dashboard/posts` (feed or `?view=mine`), recruiter `/dashboard/company/posts`, admin `/dashboard/admin/posts`; new public `/posts/[id]` and authenticated `/dashboard/posts/[id]` details. Shared management route redirects admin to moderation. Existing public Offers and role dashboards already embed PostsFeed.

## Runtime and limits
`npm run dev:modules` defaults web3030 / API4300 (verified launcher source); running status not checked at handoff. Scheduled publication advances on first Posts query after due time; no background worker. Existing Nest websocket notification integration was retained, not modified or tested with multiple live sessions. Production needs shared `POSTS_REALTIME_SECRET` and websocket exposure. Imported media currently stays in Mongo if abandoned; no garbage collection is implemented. Reposts copy the post snapshot. Nested comment replies, six comment reactions and owner-only comment editing/deletion are implemented. Other app features (network/groups/messages/auth) are outside this integration.

## Verification in this checkout
- `node --test cv-module/tests/posts-actions.node.cjs`: 11 pass, isolated in-memory collection adapter and mocked identity. Covers auth/ownership, company jobs, visibility, scheduling, reactions/bookmarks, votes, hiding, moderation, comment replies/edit/delete and invalid uploads. Does not test actual Mongo indexes/session cookies.
- `node scripts/test-posts-ui.cjs`: passes real Edge/React interaction with mocked Server Actions. Candidate poll/draft, company job/scheduling, vote, comment reply, modal dismissal, widths320/390/768/1440, no page errors. Screenshots `output/posts-review/`; desktop feed and mobile composer visually inspected. Edge required sandbox escalation.
- Frontend TypeScript passes. Next production build `.next-posts-review` passed with existing jose Edge warnings; final follow-up build including nested comments/media passed (exit0) after EPERM sandbox retry with escalation.
- `npm run test:preservation` fails: baseline `.module-backup/original-files.json` absent. `context-check` unavailable. No graph exists, so no graph refresh.
- Prior full module suite/backend checks are blocked by missing vite/PGlite as documented in CV-MODULES.md; no new whole-backend claim. Local mongod executable is absent; no live Atlas or real logged-in end-to-end writes performed.

## Existing CV modules
CV library/analysis, professional profile, letters and application tracking predate this turn and remain in `cv-module`, `packages/data`, `backend`. Reviewed/redacted CV text is required for AI letter generation. Earlier live/provider and preservation results came from another checkout; recheck before relying on them here. See CV-MODULES.md for architecture and historical verification.

## Company publishing workspace follow-up
`company-posts.tsx` now provides company-specific publish trigger/modal, media/job shortcuts, published/draft/scheduled/archive tabs with counts, search/category filters and management cards. Company sidebar and dashboard CTA lead to `/dashboard/company/posts`; shared mine route redirects recruiters there. Existing composer/actions/auth reused. Frontend TypeScript and mocked Edge UI regression (including new company workspace open/drafts) pass. No live Mongo writes or new production build in this follow-up.

## Company feed visual refinement
Screenshot-targeted enterprise feed now has a soft blue header, publishing card with SVG format icons and own-job shortcut, compact wrapping categories, collapsible advanced filters, styled enterprise rail and empty-state publishing CTA. Styles scoped under `.company-feed-design` in module.css; actions/database unchanged. TypeScript passes; Edge mocked UI passes including company empty state, filter opening and overflow checks320/390/768/1440. Screenshots output/posts-review/company-feed-{redesign,empty}.png.
