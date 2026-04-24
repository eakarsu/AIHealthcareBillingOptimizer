const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { optimizeCoding } = require('../services/ai');

const router = express.Router();

// GET /api/coding-optimizations
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM coding_optimizations';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = status ? 'SELECT COUNT(*) FROM coding_optimizations WHERE status = $1' : 'SELECT COUNT(*) FROM coding_optimizations';
    const countResult = await pool.query(countQuery, status ? [status] : []);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/coding-optimizations/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coding_optimizations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Coding optimization not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/coding-optimizations
router.post('/', auth, async (req, res) => {
  try {
    const { claim_id, original_cpt, suggested_cpt, original_icd, suggested_icd, potential_revenue_change, ai_confidence, recommendation, status } = req.body;
    const result = await pool.query(
      `INSERT INTO coding_optimizations (claim_id, original_cpt, suggested_cpt, original_icd, suggested_icd, potential_revenue_change, ai_confidence, recommendation, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [claim_id, original_cpt, suggested_cpt, original_icd, suggested_icd, potential_revenue_change || 0, ai_confidence || 0, recommendation, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/coding-optimizations/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { claim_id, original_cpt, suggested_cpt, original_icd, suggested_icd, potential_revenue_change, ai_confidence, recommendation, status } = req.body;
    const result = await pool.query(
      `UPDATE coding_optimizations SET claim_id=$1, original_cpt=$2, suggested_cpt=$3, original_icd=$4, suggested_icd=$5, potential_revenue_change=$6, ai_confidence=$7, recommendation=$8, status=$9
       WHERE id=$10 RETURNING *`,
      [claim_id, original_cpt, suggested_cpt, original_icd, suggested_icd, potential_revenue_change, ai_confidence, recommendation, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Coding optimization not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/coding-optimizations/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM coding_optimizations WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Coding optimization not found' });
    res.json({ message: 'Coding optimization deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/coding-optimizations/:id/optimize - AI optimize
router.post('/:id/optimize', auth, async (req, res) => {
  try {
    const coResult = await pool.query(
      `SELECT co.*, c.patient_name, c.provider_name, c.service_date, c.billed_amount
       FROM coding_optimizations co
       LEFT JOIN claims c ON co.claim_id = c.id
       WHERE co.id = $1`, [req.params.id]);
    if (coResult.rows.length === 0) return res.status(404).json({ error: 'Coding optimization not found' });

    const codingRecord = coResult.rows[0];
    const analysis = await optimizeCoding(codingRecord);

    // Update the coding optimization with AI suggestions
    if (analysis.result && !analysis.error) {
      await pool.query(
        `UPDATE coding_optimizations SET suggested_cpt = COALESCE($1, suggested_cpt), suggested_icd = COALESCE($2, suggested_icd),
         potential_revenue_change = COALESCE($3, potential_revenue_change), ai_confidence = COALESCE($4, ai_confidence),
         recommendation = COALESCE($5, recommendation) WHERE id = $6`,
        [analysis.result.suggested_cpt, analysis.result.suggested_icd, analysis.result.potential_revenue_change,
         analysis.result.confidence, JSON.stringify(analysis.result.recommendations), req.params.id]
      );
    }

    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['coding_optimization', codingRecord.id, 'coding_optimization', JSON.stringify(codingRecord),
       JSON.stringify(analysis.result || analysis), analysis.model || 'unknown', analysis.result?.confidence || 0,
       JSON.stringify(analysis.result?.recommendations || [])]
    );

    res.json({ coding_record: codingRecord, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
