const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../services/ai');

const router = express.Router();

// GET /api/insurance-verifications
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const result = await pool.query('SELECT * FROM insurance_verifications ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const countResult = await pool.query('SELECT COUNT(*) FROM insurance_verifications');
    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insurance-verifications/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM insurance_verifications WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Verification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/insurance-verifications
router.post('/', auth, async (req, res) => {
  try {
    const { patient_id, insurance_provider, policy_number, group_number, verification_date, status, coverage_details, copay, deductible, deductible_met } = req.body;
    const result = await pool.query(
      `INSERT INTO insurance_verifications (patient_id, insurance_provider, policy_number, group_number, verification_date, status, coverage_details, copay, deductible, deductible_met)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [patient_id, insurance_provider, policy_number, group_number, verification_date || new Date(), status || 'pending', coverage_details, copay || 0, deductible || 0, deductible_met || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/insurance-verifications/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { patient_id, insurance_provider, policy_number, group_number, verification_date, status, coverage_details, copay, deductible, deductible_met } = req.body;
    const result = await pool.query(
      `UPDATE insurance_verifications SET patient_id=$1, insurance_provider=$2, policy_number=$3, group_number=$4, verification_date=$5, status=$6, coverage_details=$7, copay=$8, deductible=$9, deductible_met=$10
       WHERE id=$11 RETURNING *`,
      [patient_id, insurance_provider, policy_number, group_number, verification_date, status, coverage_details, copay, deductible, deductible_met, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Verification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/insurance-verifications/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM insurance_verifications WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Verification not found' });
    res.json({ message: 'Verification deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/insurance-verifications/:id/verify - AI verify
router.post('/:id/verify', auth, async (req, res) => {
  try {
    const verResult = await pool.query(
      `SELECT iv.*, p.first_name, p.last_name, p.dob FROM insurance_verifications iv
       LEFT JOIN patients p ON iv.patient_id = p.id WHERE iv.id = $1`, [req.params.id]);
    if (verResult.rows.length === 0) return res.status(404).json({ error: 'Verification not found' });

    const verification = verResult.rows[0];
    const analysis = await callOpenRouter(
      'You are a healthcare insurance verification expert. Analyze the insurance verification data and provide insights. Return JSON with fields: verification_status (string), coverage_assessment (string), potential_issues (array), recommendations (array), estimated_coverage_percentage (number).',
      `Verify this insurance information:\n${JSON.stringify(verification, null, 2)}`
    );

    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['insurance_verification', verification.id, 'insurance_verification', JSON.stringify(verification),
       JSON.stringify(analysis.result || analysis), analysis.model || 'unknown', 0, JSON.stringify(analysis.result?.recommendations || [])]
    );

    res.json({ verification, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
