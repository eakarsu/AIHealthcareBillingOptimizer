const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const aiRateLimiter = require('../middleware/aiRateLimit');
const {
  callOpenRouter,
  analyzeDenialPattern,
  optimizeCoding,
  analyzePayerContract,
  verifyCompliance,
  suggestAppeal,
  predictAging,
  predictPriorAuth,
  prioritizeClaims,
  predictRevenue,
} = require('../services/ai');

const router = express.Router();

async function persistAnalysis({ analysisType, entityId, entityType, inputData, response, model }) {
  const result = response.result ?? response;
  const recommendations = typeof result === 'object' && result !== null ? result.recommendations || [] : [];
  return pool.query(
    `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [analysisType, entityId || 0, entityType || 'generic', JSON.stringify(inputData || {}),
     JSON.stringify(result), model || response.model || 'unknown', 0, JSON.stringify(recommendations)]
  );
}

const sampleClaim = {
  id: 0,
  patient_name: 'Sample Patient',
  cpt_code: '99213',
  icd_code: 'I10',
  billed_amount: 185,
  allowed_amount: 125,
  paid_amount: 0,
  status: 'submitted',
  denial_reason: null,
};

const sampleContract = {
  id: 0,
  payer_name: 'Sample Payer',
  contract_number: 'SAMPLE-001',
  fee_schedule_type: 'Medicare percentage',
  reimbursement_rate: 110,
  terms: 'Sample outpatient professional services contract with timely filing and modifier rules.',
  status: 'active',
};

const sampleDenial = {
  id: 0,
  claim_id: 0,
  denial_code: 'CO-16',
  denial_reason: 'Claim lacks information needed for adjudication.',
  revenue_impact: 185,
  appeal_status: 'none',
};

// GET /api/ai-analysis
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, analysis_type } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM ai_analysis_results';
    const params = [];

    if (analysis_type) {
      query += ' WHERE analysis_type = $1';
      params.push(analysis_type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = analysis_type ? 'SELECT COUNT(*) FROM ai_analysis_results WHERE analysis_type = $1' : 'SELECT COUNT(*) FROM ai_analysis_results';
    const countResult = await pool.query(countQuery, analysis_type ? [analysis_type] : []);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai-analysis/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_analysis_results WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'AI analysis result not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-analysis - Run new AI analysis (generic)
router.post('/', auth, async (req, res) => {
  try {
    const { analysis_type, entity_id, entity_type, prompt, data } = req.body;

    if (!analysis_type || !prompt) {
      return res.status(400).json({ error: 'analysis_type and prompt are required' });
    }

    const analysis = await callOpenRouter(
      'You are a healthcare billing and revenue cycle management AI expert. Provide detailed, actionable analysis. Return your response as JSON when possible.',
      prompt + (data ? `\n\nData:\n${JSON.stringify(data, null, 2)}` : '')
    );

    const insertResult = await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [analysis_type, entity_id || 0, entity_type || 'generic', JSON.stringify(data || { prompt }),
       JSON.stringify(analysis.result || analysis), analysis.model || 'unknown', 0,
       typeof analysis.result === 'object' ? JSON.stringify(analysis.result?.recommendations || []) : '']
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-analysis/denial-analyzer
router.post('/denial-analyzer', auth, aiRateLimiter, async (req, res) => {
  try {
    let { denials, denial_ids } = req.body;
    if (!denials && Array.isArray(denial_ids) && denial_ids.length > 0) {
      const r = await pool.query('SELECT * FROM denials WHERE id = ANY($1)', [denial_ids]);
      denials = r.rows;
    } else if (!denials) {
      const r = await pool.query('SELECT * FROM denials ORDER BY created_at DESC LIMIT 100');
      denials = r.rows;
    }
    if ((!Array.isArray(denials) || denials.length === 0) && !denial_ids?.length) {
      denials = [sampleDenial];
    }
    if (!Array.isArray(denials) || denials.length === 0) {
      return res.status(400).json({ error: 'No denials available to analyze' });
    }
    const response = await analyzeDenialPattern(denials);
    if (response.error && response.fallback) {
      return res.status(502).json({ error: response.error });
    }
    const insert = await persistAnalysis({
      analysisType: 'denial_analyzer',
      entityId: 0,
      entityType: 'denial',
      inputData: { count: denials.length, ids: denials.map(d => d.id).filter(Boolean) },
      response,
    });
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-analysis/coding-recommender
router.post('/coding-recommender', auth, aiRateLimiter, async (req, res) => {
  try {
    let { claim, claim_id } = req.body;
    if (!claim && claim_id) {
      const r = await pool.query('SELECT * FROM claims WHERE id = $1', [claim_id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Claim not found' });
      claim = r.rows[0];
    }
    if (!claim) {
      const r = await pool.query('SELECT * FROM claims ORDER BY created_at DESC LIMIT 1').catch(() => ({ rows: [] }));
      claim = r.rows[0] || sampleClaim;
    }
    if (!claim) {
      return res.status(400).json({ error: 'claim or claim_id required' });
    }
    const response = await optimizeCoding(claim);
    if (response.error && response.fallback) {
      return res.status(502).json({ error: response.error });
    }
    const insert = await persistAnalysis({
      analysisType: 'coding_recommender',
      entityId: claim.id || 0,
      entityType: 'claim',
      inputData: { claim_id: claim.id },
      response,
    });
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-analysis/contract-analyzer
router.post('/contract-analyzer', auth, aiRateLimiter, async (req, res) => {
  try {
    let { contract, contract_id } = req.body;
    if (!contract && contract_id) {
      const r = await pool.query('SELECT * FROM payer_contracts WHERE id = $1', [contract_id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
      contract = r.rows[0];
    }
    if (!contract) {
      const r = await pool.query('SELECT * FROM payer_contracts ORDER BY created_at DESC LIMIT 1').catch(() => ({ rows: [] }));
      contract = r.rows[0] || sampleContract;
    }
    if (!contract) {
      return res.status(400).json({ error: 'contract or contract_id required' });
    }
    const response = await analyzePayerContract(contract);
    if (response.error && response.fallback) {
      return res.status(502).json({ error: response.error });
    }
    const insert = await persistAnalysis({
      analysisType: 'contract_analyzer',
      entityId: contract.id || 0,
      entityType: 'payer_contract',
      inputData: { contract_id: contract.id },
      response,
    });
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-analysis/compliance-checker
router.post('/compliance-checker', auth, aiRateLimiter, async (req, res) => {
  try {
    const { record, entity_type } = req.body;
    if (!record || typeof record !== 'object') {
      return res.status(400).json({ error: 'record (object) required' });
    }
    const response = await verifyCompliance(record);
    if (response.error && response.fallback) {
      return res.status(503).json({ error: response.error });
    }
    const insert = await persistAnalysis({
      analysisType: 'compliance_checker',
      entityId: record.id || 0,
      entityType: entity_type || 'compliance',
      inputData: { id: record.id, entity_type },
      response,
    });
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-analysis/appeal-generator
router.post('/appeal-generator', auth, aiRateLimiter, async (req, res) => {
  try {
    let { denial, denial_id } = req.body;
    if (!denial && denial_id) {
      const r = await pool.query('SELECT * FROM denials WHERE id = $1', [denial_id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Denial not found' });
      denial = r.rows[0];
    }
    if (!denial) {
      const r = await pool.query('SELECT * FROM denials ORDER BY created_at DESC LIMIT 1').catch(() => ({ rows: [] }));
      denial = r.rows[0] || sampleDenial;
    }
    if (!denial) return res.status(400).json({ error: 'denial or denial_id required' });
    const response = await suggestAppeal(denial);
    if (response.error && response.fallback) {
      return res.status(503).json({ error: response.error });
    }
    const insert = await persistAnalysis({
      analysisType: 'appeal_generator',
      entityId: denial.id || 0,
      entityType: 'denial',
      inputData: { denial_id: denial.id },
      response,
    });
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-analysis/aging-predictor
router.post('/aging-predictor', auth, aiRateLimiter, async (req, res) => {
  try {
    let { aging, aging_data } = req.body;
    aging = aging || aging_data;
    if (!Array.isArray(aging)) {
      const r = await pool.query('SELECT * FROM aging_reports ORDER BY created_at DESC LIMIT 100').catch(() => ({ rows: [] }));
      aging = r.rows;
    }
    if (!aging || aging.length === 0) {
      aging = [{ account: 'Sample A/R', days_past_due: 60, balance: 1200, aging_bucket: '31-60' }];
    }
    const response = await predictAging(aging);
    if (response.error && response.fallback) {
      return res.status(503).json({ error: response.error });
    }
    const insert = await persistAnalysis({
      analysisType: 'aging_predictor',
      entityId: 0,
      entityType: 'aging',
      inputData: { count: aging.length },
      response,
    });
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Apply pass 5 backlog ---------- //

// POST /api/ai-analysis/claim-prioritizer
router.post('/claim-prioritizer', auth, aiRateLimiter, async (req, res) => {
  try {
    let { claims, claim_ids, status, limit } = req.body;
    if (!claims) {
      if (Array.isArray(claim_ids) && claim_ids.length > 0) {
        const r = await pool.query('SELECT * FROM claims WHERE id = ANY($1)', [claim_ids]);
        claims = r.rows;
      } else {
        const filterStatus = status || 'pending';
        const maxLimit = Math.min(parseInt(limit) || 100, 200);
        const r = filterStatus
          ? await pool.query(
              'SELECT * FROM claims WHERE status = $1 ORDER BY created_at DESC LIMIT $2',
              [filterStatus, maxLimit]
            ).catch(() => ({ rows: [] }))
          : await pool.query('SELECT * FROM claims ORDER BY created_at DESC LIMIT $1', [maxLimit]).catch(() => ({ rows: [] }));
        claims = r.rows;
      }
    }
    if (!Array.isArray(claims) || claims.length === 0) {
      claims = [sampleClaim];
    }
    const response = await prioritizeClaims(claims);
    if (response.error && response.fallback) {
      return res.status(503).json({ error: response.error });
    }
    const insert = await persistAnalysis({
      analysisType: 'claim_prioritizer',
      entityId: 0,
      entityType: 'claims',
      inputData: { count: claims.length },
      response,
    });
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-analysis/prior-auth-prediction
router.post('/prior-auth-prediction', auth, aiRateLimiter, async (req, res) => {
  try {
    let { request, prior_auth_id } = req.body;
    if (!request && prior_auth_id) {
      const r = await pool.query('SELECT * FROM prior_authorizations WHERE id = $1', [prior_auth_id]).catch(() => ({ rows: [] }));
      if (r.rows.length === 0) return res.status(404).json({ error: 'prior auth not found' });
      request = r.rows[0];
    }
    if (!request) {
      const r = await pool.query('SELECT * FROM prior_authorizations ORDER BY created_at DESC LIMIT 1').catch(() => ({ rows: [] }));
      request = r.rows[0];
    }
    if (!request) {
      return res.status(400).json({ error: 'request or prior_auth_id required' });
    }
    const response = await predictPriorAuth(request);
    if (response.error && response.fallback) {
      return res.status(503).json({ error: response.error });
    }
    const insert = await persistAnalysis({
      analysisType: 'prior_auth_prediction',
      entityId: request.id || 0,
      entityType: 'prior_auth',
      inputData: { id: request.id, payer: request.payer || request.payer_name },
      response,
    });
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-analysis/revenue-forecaster
router.post('/revenue-forecaster', auth, aiRateLimiter, async (req, res) => {
  try {
    let { claims, lookback_days } = req.body;
    if (!Array.isArray(claims)) {
      const days = Math.max(7, Math.min(parseInt(lookback_days) || 90, 365));
      const r = await pool.query(
        `SELECT * FROM claims WHERE created_at >= NOW() - ($1 || ' days')::interval ORDER BY created_at DESC LIMIT 500`,
        [days]
      ).catch(() => ({ rows: [] }));
      claims = r.rows;
    }
    if (!claims.length) {
      claims = [sampleClaim];
    }
    const response = await predictRevenue(claims);
    if (response.error && response.fallback) {
      return res.status(503).json({ error: response.error });
    }
    const insert = await persistAnalysis({
      analysisType: 'revenue_forecaster',
      entityId: 0,
      entityType: 'claims',
      inputData: { count: claims.length, lookback_days: lookback_days || 90 },
      response,
    });
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
