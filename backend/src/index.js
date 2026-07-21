const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const pool = require('./db');
const authRoutes = require('./routes/auth');
const claimsRoutes = require('./routes/claims');
const denialsRoutes = require('./routes/denials');
const patientsRoutes = require('./routes/patients');
const paymentsRoutes = require('./routes/payments');
const providersRoutes = require('./routes/providers');
const insuranceRoutes = require('./routes/insurance');
const priorAuthRoutes = require('./routes/prior-auth');
const complianceRoutes = require('./routes/compliance');
const payerContractsRoutes = require('./routes/payer-contracts');
const agingRoutes = require('./routes/aging');
const codingRoutes = require('./routes/coding');
const auditRoutes = require('./routes/audit');
const analyticsRoutes = require('./routes/analytics');
const aiAnalysisRoutes = require('./routes/ai-analysis');
const featureGapsRoutes = require('./routes/feature-gaps');
const integrationsRoutes = require('./routes/integrations');
const chatbotRoutes = require('./routes/chatbot');
const { validateRuntime } = require('./governance/runtime');
const governanceRouter = require('./governance/router');

validateRuntime();

// === Batch 04 Gaps & Frontend Mounts ===
const app = express();
const PORT = process.env.BACKEND_PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Make pool available to gap routes via req.app.get('pool')
app.set('pool', pool);

// AI Rate limiter: 20 requests per hour
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id ? `user-${req.user.id}` : rateLimit.ipKeyGenerator(req),
  handler: (req, res) => res.status(429).json({ error: 'Too many AI requests. Limit: 20 per hour.' }),
});
app.set('aiRateLimiter', aiRateLimiter);

// Middleware
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// HIPAA Audit trail middleware - auto-log mutating operations
async function auditLog(req, res, next) {
  res.on('finish', async () => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && res.statusCode < 400) {
      try {
        await pool.query(
          'INSERT INTO audit_trail (user_id, action, entity_type, entity_id, ip_address, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
          [req.user?.id, req.method, req.path.split('/')[2], req.params?.id, req.ip]
        );
      } catch (e) { /* non-fatal */ }
    }
  });
  next();
}
app.use('/api', auditLog);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/denials', denialsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/insurance-verifications', insuranceRoutes);
app.use('/api/prior-authorizations', priorAuthRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/payer-contracts', payerContractsRoutes);
app.use('/api/aging-reports', agingRoutes);
app.use('/api/coding-optimizations', codingRoutes);
app.use('/api/audit-trail', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);
app.use('/api/feature-gaps', featureGapsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/denial-analyzer', require('./routes/denialAnalyzer'));
app.use('/api/coding-recommender', require('./routes/codingRecommender'));
app.use('/api/charge-capture-reconciliation', require('./routes/chargeCaptureReconciliation'));
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/governed-revenue-cycle', governanceRouter);

// === Batch 04 Gap Routes (must be before error/404 handlers) ===

// === Custom Feature (cf-*) Routes — frontend pages existed but backend was missing ===
app.use('/api/cf-agentic-denial-management-autonomously-d', require('../routes/cf-agentic-denial-management-autonomously-d'));
app.use('/api/cf-revenue-cycle-optimization-modeling-clai', require('../routes/cf-revenue-cycle-optimization-modeling-clai'));
app.use('/api/cf-payer-contract-intelligence-identifying-', require('../routes/cf-payer-contract-intelligence-identifying-'));
app.use('/api/cf-prior-auth-automation-submitting-followi', require('../routes/cf-prior-auth-automation-submitting-followi'));
app.use('/api/cf-coding-quality-compliance-auditor-flaggi', require('../routes/cf-coding-quality-compliance-auditor-flaggi'));
app.use('/api/cf-patient-payment-intelligence-predicting-', require('../routes/cf-patient-payment-intelligence-predicting-'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Healthcare Billing Optimizer API running on port ${PORT}`);
});

module.exports = app;
