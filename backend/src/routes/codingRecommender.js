// Coding quality + compliance auditor flagging underbilling/overbilling and
// recommending training.
// Audit: batch_04.md / AIHealthcareBillingOptimizer / Custom Feature Suggestions #5
const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const { callOpenRouter, parseAIJson } = require('../services/ai');

const router = express.Router();
router.use(auth);

// POST /api/coding-recommender/audit { claim_id?, clinical_note? }
router.post('/audit', async (req, res) => {
  try {
    const { claim_id, clinical_note } = req.body || {};

    let claim = null, existingCodes = [];
    if (claim_id) {
      try {
        const r = await pool.query(`SELECT * FROM claims WHERE id = $1`, [claim_id]);
        claim = r.rows[0] || null;
      } catch (_) {}
      try {
        const r = await pool.query(
          `SELECT code, description, type FROM coding_optimizations WHERE claim_id = $1`,
          [claim_id]
        );
        existingCodes = r.rows;
      } catch (_) {}
    }

    if (!claim && !clinical_note) {
      return res.status(400).json({ error: 'claim_id or clinical_note required' });
    }

    const systemPrompt = `You are a senior medical coding auditor. Given a claim or clinical note, recommend
the best CPT, ICD-10-CM, and HCPCS codes. Flag underbilling and overbilling risks vs. the existing codes,
and recommend documentation/training improvements. Return STRICT JSON only.`;

    const userPrompt = `Claim: ${JSON.stringify(claim)}
Existing codes: ${JSON.stringify(existingCodes)}
Clinical note (truncated): ${(clinical_note || '').slice(0, 6000)}

Return JSON:
{
  "summary": "...",
  "recommended_codes": [{ "system": "CPT|ICD-10-CM|HCPCS", "code": "string", "description": "string", "rationale": "string" }],
  "underbilling_flags": [{ "issue": "string", "potential_revenue_recovery_usd": 0 }],
  "overbilling_flags": [{ "issue": "string", "compliance_risk": "low|medium|high" }],
  "documentation_gaps": ["..."],
  "training_recommendations": ["..."],
  "compliance_score_0_100": 0,
  "disclaimer": "Coding suggestions; final coding by certified coder."
}`;

    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const text = typeof raw === 'string' ? raw : '';
    const parsed = parseAIJson(text) || { notes: typeof raw === 'string' ? raw : JSON.stringify(raw) };

    res.json({ claim_id: claim_id || null, audit: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent-audits', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, claim_id, payload, created_at FROM ai_analysis
       WHERE analysis_type = 'coding_audit' ORDER BY created_at DESC LIMIT 30`
    ).catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
