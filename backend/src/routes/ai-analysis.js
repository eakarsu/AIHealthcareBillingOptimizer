const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { callOpenRouter } = require('../services/ai');

const router = express.Router();

// GET /api/ai-analysis
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, analysis_type } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM ai_analysis_results';
    const params = [];

    if (analysis_type) {
      query += ' WHERE analysis_type = $1';
      params.push(analysis_type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countQuery = analysis_type ? 'SELECT COUNT(*) FROM ai_analysis_results WHERE analysis_type = $1' : 'SELECT COUNT(*) FROM ai_analysis_results';
    const countResult = await pool.query(countQuery, analysis_type ? [analysis_type] : []);

    res.json({ data: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai-analysis/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_analysis_results WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'AI analysis result not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-analysis - Run new AI analysis (generic)
router.post('/', auth, async (req, res) => {
  try {
    const { analysis_type, entity_id, entity_type, prompt, data } = req.body;

    if (!analysis_type || !prompt) {
      return res.status(400).json({ error: 'analysis_type and prompt are required' });
    }

    const analysis = await callOpenRouter(
      'You are a healthcare billing and revenue cycle management AI expert. Provide detailed, actionable analysis. Return your response as JSON when possible.',
      prompt + (data ? `\n\nData:\n${JSON.stringify(data, null, 2)}` : '')
    );

    const insertResult = await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [analysis_type, entity_id || 0, entity_type || 'generic', JSON.stringify(data || { prompt }),
       JSON.stringify(analysis.result || analysis), analysis.model || 'unknown', 0,
       typeof analysis.result === 'object' ? JSON.stringify(analysis.result?.recommendations || []) : '']
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
