const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');

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

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
