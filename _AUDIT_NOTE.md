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
