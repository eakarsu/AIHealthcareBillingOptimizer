const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { analyzeClaimDenialRisk } = require('../services/ai');

const router = express.Router();

// GET /api/claims
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM claims';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = status
      ? 'SELECT COUNT(*) FROM claims WHERE status = $1'
      : 'SELECT COUNT(*) FROM claims';
    const countResult = await pool.query(countQuery, status ? [status] : []);

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/claims/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM claims WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/claims
router.post('/', auth, async (req, res) => {
  try {
    const {
      patient_name, patient_dob, insurance_id, provider_name, service_date,
      cpt_code, icd_code, billed_amount, allowed_amount, paid_amount,
      status, denial_reason, submission_date,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO claims (patient_name, patient_dob, insurance_id, provider_name, service_date,
        cpt_code, icd_code, billed_amount, allowed_amount, paid_amount, status, denial_reason, submission_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [patient_name, patient_dob, insurance_id, provider_name, service_date,
        cpt_code, icd_code, billed_amount, allowed_amount || 0, paid_amount || 0,
        status || 'submitted', denial_reason, submission_date || new Date()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/claims/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      patient_name, patient_dob, insurance_id, provider_name, service_date,
      cpt_code, icd_code, billed_amount, allowed_amount, paid_amount,
      status, denial_reason, submission_date,
    } = req.body;

    const result = await pool.query(
      `UPDATE claims SET patient_name=$1, patient_dob=$2, insurance_id=$3, provider_name=$4,
        service_date=$5, cpt_code=$6, icd_code=$7, billed_amount=$8, allowed_amount=$9,
        paid_amount=$10, status=$11, denial_reason=$12, submission_date=$13
       WHERE id=$14 RETURNING *`,
      [patient_name, patient_dob, insurance_id, provider_name, service_date,
        cpt_code, icd_code, billed_amount, allowed_amount, paid_amount,
        status, denial_reason, submission_date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/claims/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM claims WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json({ message: 'Claim deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/claims/:id/analyze - AI analyze claim denial risk
router.post('/:id/analyze', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM claims WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const claim = result.rows[0];
    const analysis = await analyzeClaimDenialRisk(claim);

    // Store analysis result
    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['denial_risk', claim.id, 'claim', JSON.stringify(claim), JSON.stringify(analysis.result || analysis),
       analysis.model || 'unknown', analysis.result?.risk_score || 0,
       JSON.stringify(analysis.result?.recommendations || [])]
    );

    res.json({ claim, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
