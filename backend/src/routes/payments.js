const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/payments
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM payments';
    const params = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = status ? 'SELECT COUNT(*) FROM payments WHERE status = $1' : 'SELECT COUNT(*) FROM payments';
    const countResult = await pool.query(countQuery, status ? [status] : []);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments
router.post('/', auth, async (req, res) => {
  try {
    const { claim_id, patient_id, amount, payment_date, payment_method, reference_number, status } = req.body;
    const result = await pool.query(
      `INSERT INTO payments (claim_id, patient_id, amount, payment_date, payment_method, reference_number, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [claim_id, patient_id, amount, payment_date || new Date(), payment_method, reference_number, status || 'completed']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { claim_id, patient_id, amount, payment_date, payment_method, reference_number, status } = req.body;
    const result = await pool.query(
      `UPDATE payments SET claim_id=$1, patient_id=$2, amount=$3, payment_date=$4, payment_method=$5, reference_number=$6, status=$7
       WHERE id=$8 RETURNING *`,
      [claim_id, patient_id, amount, payment_date, payment_method, reference_number, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM payments WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
