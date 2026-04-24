const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { analyzePayerContract } = require('../services/ai');

const router = express.Router();

// GET /api/payer-contracts
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM payer_contracts';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = status ? 'SELECT COUNT(*) FROM payer_contracts WHERE status = $1' : 'SELECT COUNT(*) FROM payer_contracts';
    const countResult = await pool.query(countQuery, status ? [status] : []);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payer-contracts/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payer_contracts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payer contract not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payer-contracts
router.post('/', auth, async (req, res) => {
  try {
    const { payer_name, contract_number, start_date, end_date, fee_schedule_type, reimbursement_rate, terms, status } = req.body;
    const result = await pool.query(
      `INSERT INTO payer_contracts (payer_name, contract_number, start_date, end_date, fee_schedule_type, reimbursement_rate, terms, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [payer_name, contract_number, start_date, end_date, fee_schedule_type, reimbursement_rate || 0, terms, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payer-contracts/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { payer_name, contract_number, start_date, end_date, fee_schedule_type, reimbursement_rate, terms, status } = req.body;
    const result = await pool.query(
      `UPDATE payer_contracts SET payer_name=$1, contract_number=$2, start_date=$3, end_date=$4, fee_schedule_type=$5, reimbursement_rate=$6, terms=$7, status=$8
       WHERE id=$9 RETURNING *`,
      [payer_name, contract_number, start_date, end_date, fee_schedule_type, reimbursement_rate, terms, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payer contract not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payer-contracts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM payer_contracts WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payer contract not found' });
    res.json({ message: 'Payer contract deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payer-contracts/:id/analyze - AI analyze contract
router.post('/:id/analyze', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payer_contracts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payer contract not found' });

    const contract = result.rows[0];
    const analysis = await analyzePayerContract(contract);

    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['contract_analysis', contract.id, 'payer_contract', JSON.stringify(contract),
       JSON.stringify(analysis.result || analysis), analysis.model || 'unknown', 0, JSON.stringify(analysis.result?.recommendations || [])]
    );

    res.json({ contract, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
