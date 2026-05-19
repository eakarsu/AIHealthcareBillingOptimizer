// Agentic denial management autonomously drafting appeals with supporting
// documentation.
// Audit: batch_04.md / AIHealthcareBillingOptimizer / Custom Feature Suggestions #1
const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const { callOpenRouter, parseAIJson } = require('../services/ai');

const router = express.Router();
router.use(auth);

// POST /api/denial-analyzer/analyze { denial_id }
router.post('/analyze', async (req, res) => {
  try {
    const { denial_id } = req.body || {};
    if (!denial_id) return res.status(400).json({ error: 'denial_id required' });

    let denial = null, claim = null, codes = [];
    try {
      const r = await pool.query(`SELECT * FROM denials WHERE id = $1`, [denial_id]);
      denial = r.rows[0] || null;
    } catch (_) {}
    if (denial?.claim_id) {
      try {
        const r = await pool.query(`SELECT * FROM claims WHERE id = $1`, [denial.claim_id]);
        claim = r.rows[0] || null;
      } catch (_) {}
      try {
        const r = await pool.query(`SELECT code, description, type FROM coding_optimizations WHERE claim_id = $1`, [denial.claim_id]);
        codes = r.rows;
      } catch (_) {}
    }

    const systemPrompt = `You are a healthcare denial-management specialist. Given a denial reason code,
the original claim, and CPT/ICD-10 codes, predict appeal success probability and draft a structured appeal
letter with supporting medical-necessity language. Return STRICT JSON only.`;

    const userPrompt = `Denial: ${JSON.stringify(denial)}
Claim: ${JSON.stringify(claim)}
Coding: ${JSON.stringify(codes)}

Return JSON:
{
  "summary": "...",
  "denial_root_cause": "string",
  "appeal_success_probability_pct": 0,
  "recommended_action": "appeal|rebill|write_off|peer_to_peer_review",
  "appeal_letter_draft": "string (3-5 paragraphs, formal)",
  "supporting_documentation_required": ["..."],
  "estimated_recovery_usd": 0,
  "deadline_advice": "string",
  "disclaimer": "AI-drafted; billing manager to review and finalize."
}`;

    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const text = typeof raw === 'string' ? raw : (raw && raw.fallback ? '' : '');
    const parsed = parseAIJson(text) || { notes: typeof raw === 'string' ? raw : JSON.stringify(raw) };

    try {
      await pool.query(
        `INSERT INTO ai_analysis (user_id, claim_id, denial_id, analysis_type, payload, created_at)
         VALUES ($1,$2,$3,$4,$5,NOW())`,
        [req.user?.id || null, denial?.claim_id || null, denial_id, 'denial_appeal', JSON.stringify(parsed)]
      ).catch(() => {});
    } catch (_) {}

    res.json({ denial_id, analysis: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, denial_id, payload, created_at FROM ai_analysis
       WHERE analysis_type = 'denial_appeal' ORDER BY created_at DESC LIMIT 30`
    ).catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
