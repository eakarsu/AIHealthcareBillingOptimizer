# Feature Expansion Plan

Target product: Healthcare Revenue Cycle / Billing Copilot

## 1. Claim Intake
- Add claim import for superbills, encounters, CPT codes, ICD codes, payer data, patient balances, and supporting documents.
- Backend tables: `claim_intake_batches`, `claim_intake_items`, `claim_documents`.
- UI entry points: Claims, Patients, Providers, Insurance.
- First workflow: upload CSV or manually create batch, validate required fields, push accepted items to claims queue.

## 2. Denial Prediction
- Add pre-submission denial risk scoring per claim.
- Backend tables: `denial_risk_scores`, `denial_risk_factors`.
- UI entry points: Claims, Denials, AI Analysis.
- First workflow: score claim, show reasons, recommend fixes before submission.

## 3. Coding Review
- Add CPT/ICD mismatch checks, missing modifiers, duplicate charges, documentation gaps, and medical necessity warnings.
- Backend tables: `coding_reviews`, `coding_review_findings`.
- UI entry points: Coding, Compliance, Claims.
- First workflow: run review against selected claim and create coder tasks.

## 4. Payer Rules Engine
- Add payer-specific rules, prior auth rules, timely filing limits, policy notes, and version history.
- Backend tables: `payer_rules`, `payer_rule_versions`, `payer_rule_exceptions`.
- UI entry points: Payer Contracts, Insurance, Prior Auth.
- First workflow: manage payer rules and apply them during claim validation.

## 5. A/R Work Queue
- Prioritize unpaid claims by amount, age, payer, denial risk, deadline, and next best action.
- Backend tables: `ar_work_items`, `ar_work_item_actions`.
- UI entry points: Aging Reports, Claims, Payments.
- First workflow: biller queue with filters and next-action recommendations.

## 6. Appeal Automation
- Generate appeal letters, attach evidence, track appeal status, and monitor appeal deadlines.
- Backend tables: `appeals`, `appeal_documents`, `appeal_events`.
- UI entry points: Denials, Claims, AI Analysis.
- First workflow: select denied claim, generate appeal draft, attach supporting docs, mark submitted.

## 7. Payment Reconciliation
- Match ERA/EOB/payment files to claims and flag underpayments, overpayments, and missing payments.
- Backend tables: `payment_reconciliation_batches`, `payment_reconciliation_matches`, `payment_variances`.
- UI entry points: Payments, Payer Contracts, Analytics.
- First workflow: import payment file, auto-match claims, resolve variances.

## 8. Revenue Dashboard
- Show clean claim rate, denial rate, days in A/R, recovered revenue, payer performance, and top denial reasons.
- Backend views: `revenue_cycle_metrics`, `payer_performance_metrics`.
- UI entry points: Dashboard, Analytics.
- First workflow: executive dashboard with drilldowns to claim queues.
