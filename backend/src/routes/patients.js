const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/patients
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM patients';
    const params = [];

    if (search) {
      query += ` WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = search
      ? `SELECT COUNT(*) FROM patients WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1`
      : 'SELECT COUNT(*) FROM patients';
    const countResult = await pool.query(countQuery, search ? [`%${search}%`] : []);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/patients
router.post('/', auth, async (req, res) => {
  try {
    const { first_name, last_name, dob, insurance_provider, insurance_id, phone, email, address, balance_due } = req.body;
    const result = await pool.query(
      `INSERT INTO patients (first_name, last_name, dob, insurance_provider, insurance_id, phone, email, address, balance_due)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [first_name, last_name, dob, insurance_provider, insurance_id, phone, email, address, balance_due || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/patients/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { first_name, last_name, dob, insurance_provider, insurance_id, phone, email, address, balance_due } = req.body;
    const result = await pool.query(
      `UPDATE patients SET first_name=$1, last_name=$2, dob=$3, insurance_provider=$4, insurance_id=$5, phone=$6, email=$7, address=$8, balance_due=$9
       WHERE id=$10 RETURNING *`,
      [first_name, last_name, dob, insurance_provider, insurance_id, phone, email, address, balance_due, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/patients/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    res.json({ message: 'Patient deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
