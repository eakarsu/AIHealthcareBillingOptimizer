// === Real domain-aware route (replaces generic echo stub) ===
// Feature slug: gap-no-prior-auth-approval-likelihood-predic
// Pulls real data from Postgres + calls real OpenRouter helpers via _featureEngine.

const express = require('express');
const path = require('path');
const auth = require(path.resolve(__dirname, '../src/middleware/auth'));
const { handle } = require('./_featureEngine');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const aiRateLimiter = req.app.get('aiRateLimiter');
  if (aiRateLimiter) return aiRateLimiter(req, res, () => handle('gap-no-prior-auth-approval-likelihood-predic', req, res));
  return handle('gap-no-prior-auth-approval-likelihood-predic', req, res);
});

module.exports = router;
