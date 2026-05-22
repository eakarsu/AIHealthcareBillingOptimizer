# Audit Apply Notes — AIHealthcareBillingOptimizer

## Source
`/Users/erolakarsu/projects/_AUDIT/reports/batch_04.md` section 17.

## Original Recommendations (AI Counterparts)
- `/denial-analyzer` — analyze denials, predict reversals, recommend appeals
- `/coding-recommender` — suggest ICD-10/CPT codes from clinical notes
- `/contract-analyzer` — analyze payer contracts for optimization
- `/claim-prioritizer` — prioritize claims by approval likelihood
- `/compliance-checker` — flag billing compliance risks
- `/prior-auth-prediction` — predict prior auth approval likelihood

Note: the project already had AI helpers in `src/services/ai.js` (analyzeDenialPattern, optimizeCoding, analyzePayerContract, verifyCompliance, suggestAppeal, predictAging, etc.) but they were unwired — only a generic POST `/api/ai-analysis` existed.

## Implemented (this pass)
Wired three existing helpers as dedicated REST endpoints under the existing `/api/ai-analysis` router, all using `auth` + `aiRateLimiter` and persisting to `ai_analysis_results`:

- `POST /api/ai-analysis/denial-analyzer` — accepts `{ denials }` or `{ denial_ids }`; if neither, pulls latest 100 denials. Calls `analyzeDenialPattern`.
- `POST /api/ai-analysis/coding-recommender` — accepts `{ claim }` or `{ claim_id }`. Calls `optimizeCoding`.
- `POST /api/ai-analysis/contract-analyzer` — accepts `{ contract }` or `{ contract_id }`. Calls `analyzePayerContract`.

Also added a small `persistAnalysis` helper in the route file to standardize storage. Imported `aiRateLimiter` from existing middleware.

Syntax: `node --check` passes.

## Backlog
- `/claim-prioritizer` — needs ranking criteria + bulk-claim service helper.
- `/compliance-checker` — `verifyCompliance` exists; route layer skipped to honour 3-item limit; trivial follow-up.
- `/prior-auth-prediction` — needs new service helper + entity model decisions.
- Custom feature suggestions: agentic denial management, revenue cycle modelling, contract intelligence dashboards, prior auth automation, coding QA, patient payment intelligence.

## Categorization
- MECHANICAL: 3 endpoints above (done). `/compliance-checker` route is also mechanical (helper exists) — deferred to keep ≤3 implementations per scope.
- NEEDS-PRODUCT-DECISION: claim-prioritizer scoring rubric, prior-auth-prediction inputs.
- NEEDS-CREDS / external integration: payer APIs, EHR integration, real-time claim status.

## Apply pass 3 (frontend)

- **Action:** LEFT-AS-IS
- **Stack:** Express (`backend/src/index.js`) + CRA frontend, JWT Bearer auth via `frontend/src/services/api.js` (`localStorage.getItem('token')`, 401 redirect).
- **Backend endpoints checked:** `/api/ai-analysis` GET list/detail, generic POST, and pass-2 additions `/denial-analyzer`, `/coding-recommender`, `/contract-analyzer`.
- **Frontend wiring:** `frontend/src/pages/AdvancedAIToolsPage.js` already exposes all three pass-2 endpoints via tabs and posts with Bearer auth + `AIResultDisplay`. `AIAnalysisPage.js` lists history via `getAIAnalyses()`.
- **No FE files modified.** Idempotence rule applied.
- See `_AUDIT/apply3_logs/ab3_60.md` for batch detail.

## Apply pass 6 (close-out)

**Date:** 2026-05-21
**Scope:** verify the 3 MECHANICAL items previously flagged as deferred backlog.

### Items audited
1. `POST /api/ai-analysis/claim-prioritizer` — prioritize claims by approval likelihood.
2. `POST /api/ai-analysis/compliance-checker` — wraps existing `verifyCompliance` helper from `src/services/ai.js`.
3. `POST /api/ai-analysis/prior-auth-prediction` — predict prior auth approval likelihood.

### Verification
All three endpoints already implemented in apply pass 5 and present in `backend/src/routes/ai-analysis.js`:
- `/claim-prioritizer` — lines 267–302. `auth` + `aiRateLimiter`, accepts `{ claims }` / `{ claim_ids }` / falls back to latest pending claims, calls `prioritizeClaims`, persists to `ai_analysis_results` with `analysis_type='claim_prioritizer'`, 503 guard via `response.error && response.fallback`.
- `/compliance-checker` — lines 185–207. `auth` + `aiRateLimiter`, accepts `{ record, entity_type }`, calls existing `verifyCompliance` helper, persists with `analysis_type='compliance_checker'`, 503 guard present.
- `/prior-auth-prediction` — lines 304–331. `auth` + `aiRateLimiter`, accepts `{ request }` / `{ prior_auth_id }`, calls `predictPriorAuth`, persists with `analysis_type='prior_auth_prediction'`, 503 guard present.

Single registration each — grep confirmed no duplicates. Mount at `/api/ai-analysis` confirmed in `backend/src/index.js:93`.

### Files touched
None this pass (close-out verification only — work already landed in pass 5; see `_AUDIT_APPLY5_NOTE.md`).

### Syntax
- `node --check backend/src/routes/ai-analysis.js` — **PASS**.

### Remaining backlog
- NEEDS-CREDS: payer APIs (real-time claim status), EHR integration, real-time eligibility / 270-271, payer-specific prior auth submission endpoints.
- NEEDS-PRODUCT-DECISION: scoring-rubric tuning for `/claim-prioritizer` (currently LLM-ranked).
- TOO-RISKY: autonomous appeal submission, autonomous prior-auth resubmission.

### Status
All MECHANICAL backlog items from pass 2 are closed.
