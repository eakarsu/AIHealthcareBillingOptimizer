const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/providers
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, specialty } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM providers';
    const params = [];

    if (specialty) {
      query += ' WHERE specialty ILIKE $1';
      params.push(`%${specialty}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = specialty ? `SELECT COUNT(*) FROM providers WHERE specialty ILIKE $1` : 'SELECT COUNT(*) FROM providers';
    const countResult = await pool.query(countQuery, specialty ? [`%${specialty}%`] : []);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/providers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM providers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/providers
router.post('/', auth, async (req, res) => {
  try {
    const { name, npi, specialty, tax_id, address, phone, email, contract_rate } = req.body;
    const result = await pool.query(
      `INSERT INTO providers (name, npi, specialty, tax_id, address, phone, email, contract_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, npi, specialty, tax_id, address, phone, email, contract_rate || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/providers/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, npi, specialty, tax_id, address, phone, email, contract_rate } = req.body;
    const result = await pool.query(
      `UPDATE providers SET name=$1, npi=$2, specialty=$3, tax_id=$4, address=$5, phone=$6, email=$7, contract_rate=$8
       WHERE id=$9 RETURNING *`,
      [name, npi, specialty, tax_id, address, phone, email, contract_rate, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/providers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM providers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Provider not found' });
    res.json({ message: 'Provider deleted', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
