// === Custom feature route (previously missing — frontend called it but no backend existed) ===
// Feature slug: cf-coding-quality-compliance-auditor-flaggi
// Pulls real data from Postgres + calls real OpenRouter helpers via _featureEngine.

const express = require('express');
const path = require('path');
const auth = require(path.resolve(__dirname, '../src/middleware/auth'));
const { handle } = require('./_featureEngine');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const aiRateLimiter = req.app.get('aiRateLimiter');
  if (aiRateLimiter) return aiRateLimiter(req, res, () => handle('cf-coding-quality-compliance-auditor-flaggi', req, res));
  return handle('cf-coding-quality-compliance-auditor-flaggi', req, res);
});

module.exports = router;
