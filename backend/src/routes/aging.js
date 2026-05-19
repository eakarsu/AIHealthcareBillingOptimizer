const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const aiRateLimiter = require('../middleware/aiRateLimit');
const { predictAging } = require('../services/ai');

const router = express.Router();

// GET /api/aging-reports
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, aging_bucket } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM aging_reports';
    const params = [];

    if (aging_bucket) {
      query += ' WHERE aging_bucket = $1';
      params.push(aging_bucket);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = aging_bucket ? 'SELECT COUNT(*) FROM aging_reports WHERE aging_bucket = $1' : 'SELECT COUNT(*) FROM aging_reports';
    const countResult = await pool.query(countQuery, aging_bucket ? [aging_bucket] : []);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aging-reports/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aging_reports WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aging report not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aging-reports
router.post('/', auth, async (req, res) => {
  try {
    const { patient_id, claim_id, amount, aging_bucket, days_outstanding, last_action, last_action_date } = req.body;
    const result = await pool.query(
      `INSERT INTO aging_reports (patient_id, claim_id, amount, aging_bucket, days_outstanding, last_action, last_action_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [patient_id, claim_id, amount, aging_bucket || '0-30', days_outstanding || 0, last_action, last_action_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/aging-reports/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { patient_id, claim_id, amount, aging_bucket, days_outstanding, last_action, last_action_date } = req.body;
    const result = await pool.query(
      `UPDATE aging_reports SET patient_id=$1, claim_id=$2, amount=$3, aging_bucket=$4, days_outstanding=$5, last_action=$6, last_action_date=$7
       WHERE id=$8 RETURNING *`,
      [patient_id, claim_id, amount, aging_bucket, days_outstanding, last_action, last_action_date, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aging report not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/aging-reports/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM aging_reports WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Aging report not found' });
    res.json({ message: 'Aging report deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aging-reports/:id/predict - AI predict collection for single record
router.post('/:id/predict', auth, aiRateLimiter, async (req, res) => {
  try {
    const record = await pool.query('SELECT * FROM aging_reports WHERE id = $1', [req.params.id]);
    if (record.rows.length === 0) return res.status(404).json({ error: 'Aging report not found' });

    const aging = record.rows[0];
    const analysis = await predictAging([aging]);

    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['aging_prediction', aging.id, 'aging_report', JSON.stringify(aging),
       JSON.stringify(analysis.result || analysis), analysis.model || 'unknown',
       analysis.result?.collection_probability || 0, JSON.stringify(analysis.result?.recommended_actions || [])]
    );

    res.json({ aging, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aging-reports/predict - AI predict collections
router.post('/predict', auth, aiRateLimiter, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aging_reports ORDER BY days_outstanding DESC LIMIT 100');
    const analysis = await predictAging(result.rows);

    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['aging_prediction', 0, 'aging_reports', JSON.stringify({ count: result.rows.length }),
       JSON.stringify(analysis.result || analysis), analysis.model || 'unknown', 0, JSON.stringify(analysis.result?.recommended_actions || [])]
    );

    res.json({ total_records: result.rows.length, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
