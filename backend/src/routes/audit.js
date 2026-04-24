const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/audit-trail
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, entity_type, user_id } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM audit_trail';
    const params = [];
    const conditions = [];

    if (entity_type) {
      conditions.push(`entity_type = $${params.length + 1}`);
      params.push(entity_type);
    }
    if (user_id) {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(user_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM audit_trail';
    const countParams = [];
    const countConditions = [];
    if (entity_type) {
      countConditions.push(`entity_type = $${countParams.length + 1}`);
      countParams.push(entity_type);
    }
    if (user_id) {
      countConditions.push(`user_id = $${countParams.length + 1}`);
      countParams.push(user_id);
    }
    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit-trail/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_trail WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Audit trail entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
