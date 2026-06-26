// === Real domain-aware feature engine for gap/cf routes ===
// Replaces the original generic "echo" stubs. Each feature:
//  - pulls relevant rows from the real Postgres schema (req.app.get('pool'))
//  - calls the real OpenRouter helpers in src/services/ai.js
//  - persists to ai_analysis_results
//  - returns a structured { feature, title, result, context_used } payload
//
// Auth + aiRateLimiter are applied by the route files that consume this.

const path = require('path');
const ai = require(path.resolve(__dirname, '../src/services/ai'));

async function persist(pool, analysisType, inputData, response, model) {
  if (!pool) return;
  const result = response && (response.result ?? response);
  const recs = result && typeof result === 'object' ? result.recommendations || [] : [];
  try {
    await pool.query(
      `INSERT INTO ai_analysis_results
        (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [analysisType, 0, 'feature', JSON.stringify(inputData || {}),
       JSON.stringify(result ?? {}), model || (response && response.model) || 'unknown', 0,
       JSON.stringify(recs)]
    );
  } catch (e) { /* non-fatal: ai_analysis_results may be absent in stripped DBs */ }
}

// Map each feature slug to: which real data it loads + which AI helper it runs.
// `load(pool, body)` returns the domain context object passed to the helper.
const FEATURES = {
  // ---- gap-* features ----
  'gap-no-denial-analyzer-predict-reversals-rec': {
    title: 'Denial Analyzer — predict reversals & recommend appeals',
    type: 'denial_analyzer',
    async load(pool) {
      const { rows } = await pool.query(
        `SELECT d.*, c.cpt_code, c.icd_code, c.billed_amount, c.insurance_id, c.provider_name
         FROM denials d LEFT JOIN claims c ON c.id = d.claim_id
         ORDER BY d.created_at DESC LIMIT 50`);
      return rows;
    },
    run: (ctx) => ai.analyzeDenialPattern(ctx),
  },
  'gap-no-coding-recommender-suggest-icd-10cpt': {
    title: 'Coding Recommender — suggest ICD-10 / CPT',
    type: 'coding_recommender',
    async load(pool, body) {
      const id = body && (body.claim_id || (body.context && body.context.claim_id));
      const q = id
        ? await pool.query('SELECT * FROM claims WHERE id = $1', [id])
        : await pool.query("SELECT * FROM claims ORDER BY created_at DESC LIMIT 1");
      return q.rows[0] || { note: 'no claim found', free_text: body && body.input };
    },
    run: (ctx) => ai.optimizeCoding(ctx),
  },
  'gap-no-contract-analyzer': {
    title: 'Payer Contract Analyzer',
    type: 'contract_analyzer',
    async load(pool, body) {
      const id = body && (body.contract_id || (body.context && body.context.contract_id));
      const q = id
        ? await pool.query('SELECT * FROM payer_contracts WHERE id = $1', [id])
        : await pool.query('SELECT * FROM payer_contracts ORDER BY created_at DESC LIMIT 1');
      return q.rows[0] || { note: 'no contract found' };
    },
    run: (ctx) => ai.analyzePayerContract(ctx),
  },
  'gap-no-claim-prioritizer': {
    title: 'Claim Prioritizer — rank by approval likelihood',
    type: 'claim_prioritizer',
    async load(pool) {
      const { rows } = await pool.query(
        "SELECT id, patient_name, insurance_id, cpt_code, icd_code, billed_amount, status, denial_reason, service_date FROM claims WHERE status NOT IN ('paid') ORDER BY billed_amount DESC LIMIT 25");
      return rows;
    },
    run: (ctx) => ai.prioritizeClaims(ctx),
  },
  'gap-no-compliance-risk-checker': {
    title: 'Compliance Risk Checker',
    type: 'compliance_checker',
    async load(pool) {
      const { rows } = await pool.query(
        'SELECT * FROM compliance_records ORDER BY created_at DESC LIMIT 25');
      return { compliance_records: rows };
    },
    run: (ctx) => ai.verifyCompliance(ctx),
  },
  'gap-no-prior-auth-approval-likelihood-predic': {
    title: 'Prior Auth Approval Likelihood Predictor',
    type: 'prior_auth_prediction',
    async load(pool, body) {
      const id = body && (body.prior_auth_id || (body.context && body.context.prior_auth_id));
      const q = id
        ? await pool.query('SELECT * FROM prior_authorizations WHERE id = $1', [id])
        : await pool.query("SELECT * FROM prior_authorizations WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1");
      return q.rows[0] || { note: 'no prior auth found' };
    },
    run: (ctx) => ai.predictPriorAuth(ctx),
  },
  'gap-no-appeal-workflow-automation': {
    title: 'Appeal Workflow Automation — draft appeal',
    type: 'appeal_workflow',
    async load(pool, body) {
      const id = body && (body.denial_id || (body.context && body.context.denial_id));
      const q = id
        ? await pool.query(
            `SELECT d.*, c.cpt_code, c.icd_code, c.billed_amount, c.insurance_id FROM denials d
             LEFT JOIN claims c ON c.id = d.claim_id WHERE d.id = $1`, [id])
        : await pool.query(
            `SELECT d.*, c.cpt_code, c.icd_code, c.billed_amount, c.insurance_id FROM denials d
             LEFT JOIN claims c ON c.id = d.claim_id
             WHERE d.appeal_status IN ('none','pending') ORDER BY d.revenue_impact DESC LIMIT 1`);
      return q.rows[0] || { note: 'no denial found' };
    },
    run: (ctx) => ai.suggestAppeal(ctx),
  },
  // ---- cf-* (custom feature) endpoints — previously missing entirely ----
  'cf-agentic-denial-management-autonomously-d': {
    title: 'Agentic Denial Management — autonomous appeal drafting',
    type: 'cf_agentic_denial_mgmt',
    async load(pool) {
      const { rows } = await pool.query(
        `SELECT d.*, c.cpt_code, c.icd_code, c.billed_amount, c.insurance_id, c.provider_name
         FROM denials d LEFT JOIN claims c ON c.id = d.claim_id
         WHERE d.appeal_status IN ('none','pending') ORDER BY d.revenue_impact DESC LIMIT 20`);
      return { open_denials: rows };
    },
    run: (ctx) => ai.analyzeDenialPattern(ctx.open_denials || ctx),
  },
  'cf-revenue-cycle-optimization-modeling-clai': {
    title: 'Revenue Cycle Optimization — model claim revenue',
    type: 'cf_revenue_cycle',
    async load(pool) {
      const { rows } = await pool.query(
        'SELECT id, insurance_id, cpt_code, billed_amount, allowed_amount, paid_amount, status, service_date FROM claims ORDER BY service_date DESC LIMIT 100');
      return rows;
    },
    run: (ctx) => ai.predictRevenue(ctx),
  },
  'cf-payer-contract-intelligence-identifying-': {
    title: 'Payer Contract Intelligence',
    type: 'cf_contract_intelligence',
    async load(pool) {
      const q = await pool.query('SELECT * FROM payer_contracts ORDER BY reimbursement_rate ASC LIMIT 1');
      return q.rows[0] || { note: 'no contract found' };
    },
    run: (ctx) => ai.analyzePayerContract(ctx),
  },
  'cf-prior-auth-automation-submitting-followi': {
    title: 'Prior Auth Automation',
    type: 'cf_prior_auth_automation',
    async load(pool) {
      const q = await pool.query(
        "SELECT * FROM prior_authorizations WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1");
      return q.rows[0] || { note: 'no pending prior auth found' };
    },
    run: (ctx) => ai.predictPriorAuth(ctx),
  },
  'cf-coding-quality-compliance-auditor-flaggi': {
    title: 'Coding Quality & Compliance Auditor',
    type: 'cf_coding_quality',
    async load(pool) {
      const q = await pool.query(
        `SELECT id, cpt_code, icd_code, billed_amount, status, denial_reason FROM claims
         ORDER BY created_at DESC LIMIT 30`);
      return { records: q.rows, audit_scope: 'coding accuracy and billing compliance' };
    },
    run: (ctx) => ai.verifyCompliance(ctx),
  },
  'cf-patient-payment-intelligence-predicting-': {
    title: 'Patient Payment Intelligence — predict collections',
    type: 'cf_patient_payment',
    async load(pool) {
      const { rows } = await pool.query(
        `SELECT a.*, p.first_name, p.last_name, p.balance_due
         FROM aging_reports a LEFT JOIN patients p ON p.id = a.patient_id
         ORDER BY a.days_outstanding DESC LIMIT 40`);
      return rows;
    },
    run: (ctx) => ai.predictAging(ctx),
  },
};

// Features that don't map to a domain AI helper still get a real OpenRouter call
// via callOpenRouter with a feature-specific system prompt + any DB context we can find.
const GENERIC_PROMPTS = {
  'gap-no-ehr-integration-clinical-data-for':
    'You are an EHR integration architect for a healthcare billing platform. Given the clinical/billing context, produce a concrete integration plan: data mappings (HL7/FHIR resources to billing entities), sync strategy, and risks. Return JSON with fields: integration_plan, data_mappings (array), risks (array), recommendations (array), summary.',
  'gap-no-payer-api-integration-real-time':
    'You are a payer EDI/API integration expert (270/271 eligibility, 276/277 claim status). Given the context, produce a real-time payer integration design. Return JSON with fields: transactions_supported (array), architecture, error_handling (array), recommendations (array), summary.',
  'gap-no-provider-credential-verification':
    'You are a provider credentialing / enrollment specialist. Given provider context, outline a credential verification workflow (NPI, license, sanctions, CAQH). Return JSON with fields: verification_steps (array), data_sources (array), red_flags (array), recommendations (array), summary.',
  'gap-no-notification-engine-0-references':
    'You are a notifications/workflow engineer for a revenue-cycle platform. Given operational context, design a notification engine (events, channels, escalation, dedupe). Return JSON with fields: event_types (array), channels (array), escalation_rules (array), recommendations (array), summary.',
  'gap-no-webhook-surface-for-payer-event':
    'You are an integrations engineer designing a webhook surface for payer events. Given context, define the webhook contract. Return JSON with fields: event_catalog (array), payload_schema (object), security (array), retry_policy, recommendations (array), summary.',
  'gap-no-file-upload-for-clinical-notes':
    'You are a healthcare document-ingestion expert. Given clinical note context, outline a secure upload + extraction pipeline (OCR/NLP -> structured codes). Return JSON with fields: pipeline_steps (array), extracted_fields (array), phi_safeguards (array), recommendations (array), summary.',
};

async function handle(slug, req, res) {
  const pool = req.app.get('pool') || req.app.locals.pool || null;
  const body = req.body || {};
  const userInput = body.input || '';
  const feature = FEATURES[slug];

  try {
    if (feature) {
      let context = {};
      try { if (pool) context = await feature.load(pool, body); } catch (e) { context = { load_error: e.message }; }
      const response = await feature.run(context);

      if (response && response.error && response.fallback) {
        // Real AI call attempted but key/model issue — surface honestly.
        return res.status(503).json({
          feature: slug, title: feature.title,
          error: response.error,
          hint: 'AI provider unavailable. Set OPENROUTER_API_KEY/OPENROUTER_MODEL.',
        });
      }
      await persist(pool, feature.type, { input: userInput, context }, response, response && response.model);
      return res.json({
        feature: slug,
        title: feature.title,
        result: response.result ?? response,
        model: response.model,
        context_used: context,
      });
    }

    // Generic-but-real OpenRouter feature (design/advisory features without a domain helper)
    const sys = GENERIC_PROMPTS[slug] ||
      'You are an expert healthcare revenue-cycle assistant. Provide a structured, actionable response as JSON.';
    const response = await ai.callOpenRouter(
      sys,
      `${userInput || 'Provide a best-practice plan for this feature.'}\nFeature: ${slug}\nContext: ${JSON.stringify(body.context || {})}`
    );
    if (response && response.error && response.fallback) {
      return res.status(503).json({
        feature: slug, error: response.error,
        hint: 'AI provider unavailable. Set OPENROUTER_API_KEY/OPENROUTER_MODEL.',
      });
    }
    await persist(pool, slug.replace(/-/g, '_'), { input: userInput, context: body.context }, response, response && response.model);
    return res.json({ feature: slug, result: response.result ?? response, model: response.model });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}

module.exports = { handle, FEATURES, GENERIC_PROMPTS };
