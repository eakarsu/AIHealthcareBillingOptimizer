const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { verifyCompliance } = require('../services/ai');

const router = express.Router();

// GET /api/compliance
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM compliance_records';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = status ? 'SELECT COUNT(*) FROM compliance_records WHERE status = $1' : 'SELECT COUNT(*) FROM compliance_records';
    const countResult = await pool.query(countQuery, status ? [status] : []);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compliance
router.post('/', auth, async (req, res) => {
  try {
    const { rule_name, category, description, status, last_audit_date, next_audit_date, findings, risk_level } = req.body;
    const result = await pool.query(
      `INSERT INTO compliance_records (rule_name, category, description, status, last_audit_date, next_audit_date, findings, risk_level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [rule_name, category, description, status || 'compliant', last_audit_date, next_audit_date, findings, risk_level || 'low']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/compliance/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { rule_name, category, description, status, last_audit_date, next_audit_date, findings, risk_level } = req.body;
    const result = await pool.query(
      `UPDATE compliance_records SET rule_name=$1, category=$2, description=$3, status=$4, last_audit_date=$5, next_audit_date=$6, findings=$7, risk_level=$8
       WHERE id=$9 RETURNING *`,
      [rule_name, category, description, status, last_audit_date, next_audit_date, findings, risk_level, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/compliance/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM compliance_records WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance record not found' });
    res.json({ message: 'Compliance record deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compliance/:id/check - AI compliance check
router.post('/:id/check', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM compliance_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compliance record not found' });

    const record = result.rows[0];
    const analysis = await verifyCompliance(record);

    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['compliance_check', record.id, 'compliance_record', JSON.stringify(record),
       JSON.stringify(analysis.result || analysis), analysis.model || 'unknown', 0, JSON.stringify(analysis.result?.action_items || [])]
    );

    res.json({ record, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
