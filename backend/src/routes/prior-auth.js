const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../services/ai');

const router = express.Router();

// GET /api/prior-authorizations
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM prior_authorizations';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = status ? 'SELECT COUNT(*) FROM prior_authorizations WHERE status = $1' : 'SELECT COUNT(*) FROM prior_authorizations';
    const countResult = await pool.query(countQuery, status ? [status] : []);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prior-authorizations/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prior_authorizations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Prior authorization not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prior-authorizations
router.post('/', auth, async (req, res) => {
  try {
    const { patient_id, provider_id, service_description, cpt_code, icd_code, status, auth_number, submit_date, decision_date, expiry_date, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO prior_authorizations (patient_id, provider_id, service_description, cpt_code, icd_code, status, auth_number, submit_date, decision_date, expiry_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [patient_id, provider_id, service_description, cpt_code, icd_code, status || 'pending', auth_number, submit_date || new Date(), decision_date, expiry_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/prior-authorizations/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { patient_id, provider_id, service_description, cpt_code, icd_code, status, auth_number, submit_date, decision_date, expiry_date, notes } = req.body;
    const result = await pool.query(
      `UPDATE prior_authorizations SET patient_id=$1, provider_id=$2, service_description=$3, cpt_code=$4, icd_code=$5, status=$6, auth_number=$7, submit_date=$8, decision_date=$9, expiry_date=$10, notes=$11
       WHERE id=$12 RETURNING *`,
      [patient_id, provider_id, service_description, cpt_code, icd_code, status, auth_number, submit_date, decision_date, expiry_date, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Prior authorization not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/prior-authorizations/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM prior_authorizations WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Prior authorization not found' });
    res.json({ message: 'Prior authorization deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prior-authorizations/:id/analyze - AI analyze
router.post('/:id/analyze', auth, async (req, res) => {
  try {
    const paResult = await pool.query(
      `SELECT pa.*, p.first_name, p.last_name, pr.name as provider_name, pr.specialty
       FROM prior_authorizations pa
       LEFT JOIN patients p ON pa.patient_id = p.id
       LEFT JOIN providers pr ON pa.provider_id = pr.id
       WHERE pa.id = $1`, [req.params.id]);
    if (paResult.rows.length === 0) return res.status(404).json({ error: 'Prior authorization not found' });

    const priorAuth = paResult.rows[0];
    const analysis = await callOpenRouter(
      'You are a healthcare prior authorization expert. Analyze the prior authorization request and predict approval likelihood. Return JSON with fields: approval_likelihood (percentage), risk_factors (array), recommendations (array), suggested_documentation (array), estimated_timeline (string), summary (string).',
      `Analyze this prior authorization request:\n${JSON.stringify(priorAuth, null, 2)}`
    );

    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['prior_auth_analysis', priorAuth.id, 'prior_authorization', JSON.stringify(priorAuth),
       JSON.stringify(analysis.result || analysis), analysis.model || 'unknown', 0, JSON.stringify(analysis.result?.recommendations || [])]
    );

    res.json({ prior_authorization: priorAuth, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
