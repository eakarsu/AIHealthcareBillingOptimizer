// === Custom feature route (previously missing — frontend called it but no backend existed) ===
// Feature slug: cf-patient-payment-intelligence-predicting-
// Pulls real data from Postgres + calls real OpenRouter helpers via _featureEngine.

const express = require('express');
const path = require('path');
const auth = require(path.resolve(__dirname, '../src/middleware/auth'));
const { handle } = require('./_featureEngine');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const aiRateLimiter = req.app.get('aiRateLimiter');
  if (aiRateLimiter) return aiRateLimiter(req, res, () => handle('cf-patient-payment-intelligence-predicting-', req, res));
  return handle('cf-patient-payment-intelligence-predicting-', req, res);
});

module.exports = router;
