const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { suggestAppeal, analyzeDenialPattern } = require('../services/ai');

const router = express.Router();

// GET /api/denials
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.query('SELECT * FROM denials ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const countResult = await pool.query('SELECT COUNT(*) FROM denials');
    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/denials/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM denials WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Denial not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/denials
router.post('/', auth, async (req, res) => {
  try {
    const { claim_id, denial_code, denial_reason, denial_date, appeal_status, appeal_date, resolution, revenue_impact } = req.body;
    const result = await pool.query(
      `INSERT INTO denials (claim_id, denial_code, denial_reason, denial_date, appeal_status, appeal_date, resolution, revenue_impact)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [claim_id, denial_code, denial_reason, denial_date || new Date(), appeal_status || 'none', appeal_date, resolution, revenue_impact || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/denials/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { claim_id, denial_code, denial_reason, denial_date, appeal_status, appeal_date, resolution, revenue_impact } = req.body;
    const result = await pool.query(
      `UPDATE denials SET claim_id=$1, denial_code=$2, denial_reason=$3, denial_date=$4, appeal_status=$5, appeal_date=$6, resolution=$7, revenue_impact=$8
       WHERE id=$9 RETURNING *`,
      [claim_id, denial_code, denial_reason, denial_date, appeal_status, appeal_date, resolution, revenue_impact, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Denial not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/denials/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM denials WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Denial not found' });
    res.json({ message: 'Denial deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/denials/:id/appeal - AI generate appeal
router.post('/:id/appeal', auth, async (req, res) => {
  try {
    const denialResult = await pool.query('SELECT d.*, c.* FROM denials d LEFT JOIN claims c ON d.claim_id = c.id WHERE d.id = $1', [req.params.id]);
    if (denialResult.rows.length === 0) return res.status(404).json({ error: 'Denial not found' });

    const denial = denialResult.rows[0];
    const analysis = await suggestAppeal(denial);

    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['appeal_suggestion', denial.id, 'denial', JSON.stringify(denial), JSON.stringify(analysis.result || analysis),
       analysis.model || 'unknown', analysis.result?.success_probability || 0, JSON.stringify(analysis.result?.key_arguments || [])]
    );

    res.json({ denial, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/denials/analyze-patterns - AI analyze patterns
router.post('/analyze-patterns', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM denials ORDER BY denial_date DESC LIMIT 100');
    const analysis = await analyzeDenialPattern(result.rows);

    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['denial_pattern', 0, 'denials', JSON.stringify({ count: result.rows.length }), JSON.stringify(analysis.result || analysis),
       analysis.model || 'unknown', 0, JSON.stringify(analysis.result?.recommendations || [])]
    );

    res.json({ total_denials: result.rows.length, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
