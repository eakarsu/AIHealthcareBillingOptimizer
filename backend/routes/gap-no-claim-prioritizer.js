// === Real domain-aware route (replaces generic echo stub) ===
// Feature slug: gap-no-claim-prioritizer
// Pulls real data from Postgres + calls real OpenRouter helpers via _featureEngine.

const express = require('express');
const path = require('path');
const auth = require(path.resolve(__dirname, '../src/middleware/auth'));
const { handle } = require('./_featureEngine');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const aiRateLimiter = req.app.get('aiRateLimiter');
  if (aiRateLimiter) return aiRateLimiter(req, res, () => handle('gap-no-claim-prioritizer', req, res));
  return handle('gap-no-claim-prioritizer', req, res);
});

module.exports = router;
