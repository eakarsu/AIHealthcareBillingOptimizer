const rateLimit = require('express-rate-limit');

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => req.user?.id ? `user-${req.user.id}` : req.ip,
  handler: (req, res) => res.status(429).json({ error: 'Too many AI requests. Limit: 20 per hour.' }),
});

module.exports = aiRateLimiter;
