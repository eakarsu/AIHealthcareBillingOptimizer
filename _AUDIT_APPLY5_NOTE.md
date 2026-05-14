# Apply Pass 5 — AIHealthcareBillingOptimizer

**Date:** 2026-05-08
**Stack:** Node-Express + React. Postgres. JWT bearer auth (`auth` middleware). `aiRateLimiter` middleware. AI helpers in `services/ai.js` returning `{result, error, fallback}` shape; routes mapped under `/api/ai-analysis/*`.
**Source audit:** `/Users/erolakarsu/projects/_AUDIT/reports/batch_04.md` section 17.

## Verified present
- Pass 2: `/denial-analyzer`, `/coding-recommender`, `/contract-analyzer`.
- Pass 4: `/compliance-checker`, `/appeal-generator`, `/aging-predictor`.
- Generic `POST /api/ai-analysis` + GET list/detail. Persistence to `ai_analysis_results`.
- 503-on-no-key pattern is implemented via `response.error && response.fallback` -> `res.status(503)`.
- FE: `frontend/src/pages/AdvancedAIToolsPage.js` exposes the 6 prior tabs.

## Implemented this pass (3 mechanical AI endpoints)
1. `POST /api/ai-analysis/claim-prioritizer` — ranks claim batches by approval likelihood / denial risk / expected revenue. Pulls latest pending claims if no `claims`/`claim_ids` provided.
2. `POST /api/ai-analysis/prior-auth-prediction` — predicts approval likelihood for a prior auth request. Includes explicit "workflow advisory, not clinical advice" disclaimer in the system prompt.
3. `POST /api/ai-analysis/revenue-forecaster` — exposes existing `predictRevenue` helper as a dedicated endpoint with configurable lookback window.

All three: `auth` + `aiRateLimiter`, persist to `ai_analysis_results`, 503-on-no-key (via `response.fallback` shape).

### Service additions (`backend/src/services/ai.js`)
- `predictPriorAuth(request)` — new helper.
- `prioritizeClaims(claims)` — new helper.
- (revenue forecaster reuses existing `predictRevenue` helper.)

### FE
- Extended `frontend/src/pages/AdvancedAIToolsPage.js`:
  - Added 3 tabs: Claim Prioritizer, Prior Auth Prediction, Revenue Forecaster.
  - Reuses existing `post`, `authHeaders`, `AIResultDisplay`, error / 503 handling.
- No new files created (same routed `/advanced-ai` page).

## Deferred / categorization
- NEEDS-PRODUCT-DECISION: scoring rubric tuning for claim-prioritizer (accept LLM ranking for now).
- NEEDS-CREDS / external integrations: payer real-time claim status, EHR integration, e-prescribing for prior auth.
- TOO-RISKY: autonomous appeal submission, autonomous resubmission of prior auths.

## Smoke test
- `node --check backend/src/routes/ai-analysis.js` PASS.
- `node --check backend/src/services/ai.js` PASS.

## Healthcare disclaimer
Prior auth endpoint system prompt explicitly says: "This is a workflow advisory tool, not clinical advice."

## Cap respected
3 of 5 allowed. Two remaining backlog endpoints (denial root-cause taxonomy and patient payment intelligence) require new schema decisions.
