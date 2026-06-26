// === Real domain-aware route (replaces generic echo stub) ===
// Feature slug: gap-no-coding-recommender-suggest-icd-10cpt
// Pulls real data from Postgres + calls real OpenRouter helpers via _featureEngine.

const express = require('express');
const path = require('path');
const auth = require(path.resolve(__dirname, '../src/middleware/auth'));
const { handle } = require('./_featureEngine');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const aiRateLimiter = req.app.get('aiRateLimiter');
  if (aiRateLimiter) return aiRateLimiter(req, res, () => handle('gap-no-coding-recommender-suggest-icd-10cpt', req, res));
  return handle('gap-no-coding-recommender-suggest-icd-10cpt', req, res);
});

module.exports = router;
