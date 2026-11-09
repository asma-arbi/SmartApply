# CV matching against SmartApply offers

The user chose offers already in SmartApply, with the existing Matching IA sidebar entry leading to a functioning candidate page inspired by the supplied reference. No external crawling or automatic applications.

Use the existing owned-CV preview/consent flow, Groq provider, Nest workflow queue, signed Asma sessions and Mongo database. Select published, non-archived internal offers from verified active companies, excluding expired deadlines and legacy-only references. Search the eligible catalogue locally using CV text/technology aliases; bound provider input to twelve shortlisted descriptions of at most 1,200 characters plus structured skills. Groq compares at most eight offers with exact contextual CV and offer excerpts. The server validates IDs/quotes, normalizes aliases and duplicates, and calculates coverage from verified matched/analyzed criteria. Show gaps and quotes; percentages are advisory criterion coverage, not a hiring probability.

Persist matching jobs privately under existing candidate_ai_jobs with owned CV hash. Same pending request converges; explicit refresh after completion creates a fresh run. Revalidate live offers before generation and when reading results, hiding closed/changed offers. Failure preserves earlier successful results. Never modify CV, profile, letters or applications.

UI: CV selector, reviewed text/consent, explicit run, recommendation cards with company/role, coverage ring, evidence details, search/location/contract/minimum coverage/sorting, saved offers and links to real job details. Reuse existing saved_jobs actions. Recover from polling errors, ignore stale responses, support mobile and keyboard.

Tests: isolated Mongo with fake AI for ownership, eligibility, grounding/duplicate handling, persistence/stale offers/dedup; real React and full-shell browser flows; provider smoke test using only fictional CV/offers. Keep auth/admin/company/Posts/CV regressions unchanged.
