const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { predictRevenue } = require('../services/ai');

const router = express.Router();

// GET /api/analytics/dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const [
      claimsCount, denialsCount, patientsCount, paymentsTotal,
      claimsByStatus, denialsByStatus, agingBuckets, recentClaims
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, SUM(billed_amount) as total_billed, SUM(paid_amount) as total_paid FROM claims'),
      pool.query('SELECT COUNT(*) as total, SUM(revenue_impact) as total_impact FROM denials'),
      pool.query('SELECT COUNT(*) as total FROM patients'),
      pool.query('SELECT COUNT(*) as total, SUM(amount) as total_amount FROM payments'),
      pool.query('SELECT status, COUNT(*) as count, SUM(billed_amount) as total FROM claims GROUP BY status'),
      pool.query("SELECT appeal_status, COUNT(*) as count FROM denials GROUP BY appeal_status"),
      pool.query('SELECT aging_bucket, COUNT(*) as count, SUM(amount) as total FROM aging_reports GROUP BY aging_bucket'),
      pool.query('SELECT * FROM claims ORDER BY created_at DESC LIMIT 10'),
    ]);

    res.json({
      overview: {
        total_claims: parseInt(claimsCount.rows[0].total),
        total_billed: parseFloat(claimsCount.rows[0].total_billed) || 0,
        total_paid: parseFloat(claimsCount.rows[0].total_paid) || 0,
        total_denials: parseInt(denialsCount.rows[0].total),
        denial_impact: parseFloat(denialsCount.rows[0].total_impact) || 0,
        total_patients: parseInt(patientsCount.rows[0].total),
        total_payments: parseInt(paymentsTotal.rows[0].total),
        total_payment_amount: parseFloat(paymentsTotal.rows[0].total_amount) || 0,
      },
      claims_by_status: claimsByStatus.rows,
      denials_by_appeal_status: denialsByStatus.rows,
      aging_buckets: agingBuckets.rows,
      recent_claims: recentClaims.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/revenue
router.get('/revenue', auth, async (req, res) => {
  try {
    const [monthlyRevenue, payerBreakdown, denialRate, collectionRate] = await Promise.all([
      pool.query(`SELECT DATE_TRUNC('month', service_date) as month, SUM(billed_amount) as billed, SUM(paid_amount) as paid, COUNT(*) as claims
                  FROM claims WHERE service_date IS NOT NULL GROUP BY DATE_TRUNC('month', service_date) ORDER BY month DESC LIMIT 12`),
      pool.query(`SELECT insurance_id as payer, COUNT(*) as claims, SUM(billed_amount) as billed, SUM(paid_amount) as paid
                  FROM claims GROUP BY insurance_id ORDER BY billed DESC LIMIT 10`),
      pool.query(`SELECT COUNT(CASE WHEN status = 'denied' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as denial_rate FROM claims`),
      pool.query(`SELECT CASE WHEN SUM(billed_amount) > 0 THEN SUM(paid_amount)::float / SUM(billed_amount) * 100 ELSE 0 END as collection_rate FROM claims`),
    ]);

    res.json({
      monthly_revenue: monthlyRevenue.rows,
      payer_breakdown: payerBreakdown.rows,
      denial_rate: parseFloat(denialRate.rows[0].denial_rate) || 0,
      collection_rate: parseFloat(collectionRate.rows[0].collection_rate) || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/ai-predict - AI revenue prediction
router.post('/ai-predict', auth, async (req, res) => {
  try {
    const claimsResult = await pool.query('SELECT * FROM claims ORDER BY service_date DESC LIMIT 100');
    const analysis = await predictRevenue(claimsResult.rows);

    await pool.query(
      `INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      ['revenue_prediction', 0, 'claims', JSON.stringify({ count: claimsResult.rows.length }),
       JSON.stringify(analysis.result || analysis), analysis.model || 'unknown', 0, JSON.stringify(analysis.result?.recommendations || [])]
    );

    res.json({ total_claims_analyzed: claimsResult.rows.length, analysis: analysis.result || analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
