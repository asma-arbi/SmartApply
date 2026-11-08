# Current state — 2026-11-08

Canonical for current work: C:/Users/moham/Desktop/project pwa/asma/SmartApply. This is the original Asma app with additive CV modules, not the earlier parent frontend/port3120 integration.

## Delivered
Next14/React18, original authentication/registration/Google chooser/account/admin/company/dashboard sources preserved. Added sidebar links to real CV library/analysis, professional profile and FR/EN letters; matching/interviews placeholders. Module content is scoped inside her existing dashboard with no second shell/login. Existing application-tracking code also connected at the previously missing candidate applications route.

cv-module/ holds copied UI, React18-compatible profile action, Server Actions and model adapters. packages/data/ holds module repositories plus server-only Asma cookie/session verifier. backend/ supplies namespaced Nest files/AI/workflows; no Nest auth controllers/issuer in MODULE_AUTH_PROVIDER=asma. Root .env unchanged; backend/.env contains only existing Groq settings. Same Atlas smartapply database/original user IDs. No reset/import/password migration.

## Verification
9 session-adapter unit tests pass. Typecheck (frontend/backend) passes; final backend noEmit passes. Two comprehensive browser scenarios pass: original registration→dashboard→CV upload/reload/preview/private isolation→analysis preview→profile persistence→FR/EN template versions/restoration→original logout→private-route rejection; original Google accounts/UI preserved. Responsive widths320/390/768/1024/1440 checked. Next14 production build passes in .next-cv-build (original jose/Edge warnings only). Live fictional Atlas/Groq analysis+FR/EN generation, private files and versions pass; exact cleanup true.

## Run / limits
npm run dev:modules starts both processes; default web3000/API4300, MODULE_WEB_PORT override supported. Current running app localhost3030/API4300; supervisor74745. Separate .next-cv-dev avoids existing .next. Original npm run dev remains unchanged (Next only). See CV-MODULES.md. Real SMTP/Google OAuth/phone HTTPS installation not retested; preserve her existing demo behavior without claiming real OAuth.

Original files: .module-backup; npm run test:preservation. Recovery page source is unchanged. No graph exists.

## Letter-generator update in progress
Selected owned CV now goes through local extraction/redaction and explicit review before generation; hash/version bound. AI prompt uses reviewed CV/profile and optional target fields, rejects placeholders and unsupported numbers, and retries incomplete output once. Live fictional French/English generation succeeded after safe confirmed-name signature restoration. Semantic claim validation remains imperfect. See CV-MODULES.md.

## Cover-letter verification update
The reference PDF informed structure only. Reviewed/redacted selected-CV text is required for generation; template fallback omits unavailable fields instead of inventing placeholders. Unit tests: 20 passed; module typecheck passed; two browser regression tests passed; preservation check passed. Live fictional FR/EN Groq generation succeeded before the final conservative technology guard and fallback-template changes. A final production build compiled but stalled in the Next lint/type phase and was interrupted; a previous build passed before the last changes. Full requested scenario matrix and new AI-review browser flow are not covered; review generated facts manually. Current dev-server status unverified.
