# Deploy SmartApply: Vercel frontend + always-on Nest backend

The `deploy` branch contains the Next application, Nest AI/file service and shared Mongo package. The in-process AI worker needs a continuously running service; uploading only Next.js to Vercel does not start it. This guide uses Render for the existing Nest backend and Vercel for Next. MongoDB Atlas remains the shared database. No seed is run during deployment.

## 1. Prepare secrets and database

- Rotate the Atlas database password that was present in the old repository/local history and update your local environment too. This deployment snapshot omits old history and current embedded credentials; it cannot revoke previously exposed secrets.
- Create a strong random JWT secret (at least32 characters) and a separate POSTS_REALTIME_SECRET. Store the same values on both services. Never prefix them NEXT_PUBLIC.
- Use MongoDB Atlas connection string + explicit database smartapply. Permit the hosting services' outbound addresses in Atlas Network Access using the smallest appropriate allowlist; do not disable TLS. Both services must reach the same database.
- Obtain real reCAPTCHA v3 keys and register your final Vercel/custom domain. Example placeholder/test keys are not production keys.

## 2. Deploy the backend first (Render)

1. New → Web Service → connect github.com/asma-arbi/SmartApply → branch deploy.
2. Root Directory: repository root (leave blank), not backend; shared workspace is required.
3. Runtime: Node24. Build command: `npm ci --include=dev --legacy-peer-deps && npm run build:data && npm run build --workspace @smartapply/backend`.
4. Start command: `npm run start --workspace @smartapply/backend`. Health check: `/api/health`.
5. Use an always-on instance. A service that sleeps can leave in-process AI jobs queued; idle free hosting is unsuitable for dependable generation.
6. Add backend environment values from backend/.env.example: NODE_ENV=production, HOST=0.0.0.0, MONGODB_URI, MONGODB_DB=smartapply, MODULE_AUTH_PROVIDER=asma, JWT_SECRET, GROQ_API_KEY, GROQ_MODEL, MODULE_PUBLIC_API_PREFIX=/api/cv-module, FRONTEND_ORIGINS, PUBLIC_ORIGIN, POSTS_REALTIME_SECRET. Let the host provide PORT (Render usually10000).
7. Record the HTTPS backend URL. GET https://YOUR-API.onrender.com/api/health must return JSON with status ok. It does not prove the Groq credentials work; test generation later.

## 3. Deploy the frontend (Vercel)

1. Add New → Project → import asma-arbi/SmartApply.
2. Framework: Next.js; Root Directory: repository root (blank), not front or backend. Node.js:24.x.
3. vercel.json supplies install `npm ci --include=dev --legacy-peer-deps`, build `npm run build`, output `.next`. Do not run dev:modules on Vercel. Do not set MODULE_NEXT_DIST_DIR.
4. Set Production Branch to deploy under Project Settings → Environments/Production (or Git, depending on the current UI). A push to another branch normally creates a Preview deployment.
5. Add server-side variables: MONGODB_URI, MONGODB_DB=smartapply, JWT_SECRET (same backend value), CV_MODULE_BACKEND_URL=https://YOUR-API.onrender.com (no trailing slash), POSTS_REALTIME_SECRET (same backend value), RECAPTCHA_SECRET_KEY, RECAPTCHA_SCORE_THRESHOLD=0.5.
6. Add build-time public variables: NEXT_PUBLIC_SITE_URL=https://YOUR-PROJECT.vercel.app and NEXT_PUBLIC_RECAPTCHA_SITE_KEY (real v3 site key).
7. For real Google login, add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. In Google Cloud authorize `https://YOUR-PROJECT.vercel.app/api/auth/google/callback`. Without valid OAuth credentials, use email/password login; production never accepts the local test-email shortcut. OAuth uses state and a verified Google email.
8. Deploy. Once you know the final frontend domain, update backend FRONTEND_ORIGINS and PUBLIC_ORIGIN to that exact HTTPS origin; redeploy/restart the backend. Update Vercel NEXT_PUBLIC_SITE_URL and Google/reCAPTCHA allowed domains if the domain changed, then redeploy frontend.

## 4. Verify and operate

- Register/login with email/password and real CAPTCHA; confirm candidate/company identity, logout and account switching.
- Check jobs, a private CV preview/download, letter generation and matching; queued AI jobs must complete through the backend. Submit one test application, inspect its company dossier and exchange a message.
- Production disables development-only admin signup/self-promotion/bootstrap and the insecure reset-token URL shortcut. Password recovery is disabled until a real email delivery flow is implemented; signed-in password changes remain available with the current-password check. Existing administrator accounts remain valid. Do not expose demo passwords on a public site; remove/disable demo accounts when launching for real users.
- Messages continue eight-second polling. Posts use15-second refresh on HTTPS by default, since cross-origin WebSocket cookies are not shared between Vercel/Render domains. Do not set NEXT_PUBLIC_POSTS_WS_URL to the Render domain expecting Vercel cookies to authenticate it; same-origin WebSocket routing/tickets would require a separate setup.
- Inspect Vercel/Render logs if API proxies return502/503. Check backend health, URL, shared JWT/database, allowed origins and Atlas networking first. Never log environment values or private CV text.
- Rollback by redeploying the last successful Vercel deployment and matching Render commit. Do not reset or reseed the database.

## Sources

- https://vercel.com/docs/git
- https://vercel.com/docs/builds/configure-a-build
- https://vercel.com/docs/routing/rewrites
- https://render.com/docs/web-services
- https://render.com/docs/monorepo-support
- https://render.com/docs/background-workers
