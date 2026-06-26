// === Custom feature route (previously missing — frontend called it but no backend existed) ===
// Feature slug: cf-prior-auth-automation-submitting-followi
// Pulls real data from Postgres + calls real OpenRouter helpers via _featureEngine.

const express = require('express');
const path = require('path');
const auth = require(path.resolve(__dirname, '../src/middleware/auth'));
const { handle } = require('./_featureEngine');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const aiRateLimiter = req.app.get('aiRateLimiter');
  if (aiRateLimiter) return aiRateLimiter(req, res, () => handle('cf-prior-auth-automation-submitting-followi', req, res));
  return handle('cf-prior-auth-automation-submitting-followi', req, res);
});

module.exports = router;
