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

// === Batch 04 Gaps & Frontend Mounts ===
const route_gap_no_denial_analyzer_predict_reversals_rec = require('../routes/gap-no-denial-analyzer-predict-reversals-rec');
const route_gap_no_coding_recommender_suggest_icd_10cpt = require('../routes/gap-no-coding-recommender-suggest-icd-10cpt');
const route_gap_no_contract_analyzer = require('../routes/gap-no-contract-analyzer');
const route_gap_no_claim_prioritizer = require('../routes/gap-no-claim-prioritizer');
const route_gap_no_compliance_risk_checker = require('../routes/gap-no-compliance-risk-checker');
const route_gap_no_prior_auth_approval_likelihood_predic = require('../routes/gap-no-prior-auth-approval-likelihood-predic');
const route_gap_no_ehr_integration_clinical_data_for = require('../routes/gap-no-ehr-integration-clinical-data-for');
const route_gap_no_payer_api_integration_real_time = require('../routes/gap-no-payer-api-integration-real-time');
const route_gap_no_appeal_workflow_automation = require('../routes/gap-no-appeal-workflow-automation');
const route_gap_no_provider_credential_verification = require('../routes/gap-no-provider-credential-verification');
const route_gap_no_notification_engine_0_references = require('../routes/gap-no-notification-engine-0-references');
const route_gap_no_webhook_surface_for_payer_event = require('../routes/gap-no-webhook-surface-for-payer-event');
const route_gap_no_file_upload_for_clinical_notes = require('../routes/gap-no-file-upload-for-clinical-notes');
const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Make pool available to gap routes via req.app.get('pool')
app.set('pool', pool);

// AI Rate limiter: 20 requests per hour
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id ? `user-${req.user.id}` : req.ip,
  handler: (req, res) => res.status(429).json({ error: 'Too many AI requests. Limit: 20 per hour.' }),
});
app.set('aiRateLimiter', aiRateLimiter);

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
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
app.use('/api/denial-analyzer', require('./routes/denialAnalyzer'));
app.use('/api/coding-recommender', require('./routes/codingRecommender'));
app.use('/api/charge-capture-reconciliation', require('./routes/chargeCaptureReconciliation'));
app.use('/api/custom-views', require('./routes/customViews'));

// === Batch 04 Gap Routes (must be before error/404 handlers) ===
app.use('/api/gap-no-denial-analyzer-predict-reversals-rec', route_gap_no_denial_analyzer_predict_reversals_rec);
app.use('/api/gap-no-coding-recommender-suggest-icd-10cpt', route_gap_no_coding_recommender_suggest_icd_10cpt);
app.use('/api/gap-no-contract-analyzer', route_gap_no_contract_analyzer);
app.use('/api/gap-no-claim-prioritizer', route_gap_no_claim_prioritizer);
app.use('/api/gap-no-compliance-risk-checker', route_gap_no_compliance_risk_checker);
app.use('/api/gap-no-prior-auth-approval-likelihood-predic', route_gap_no_prior_auth_approval_likelihood_predic);
app.use('/api/gap-no-ehr-integration-clinical-data-for', route_gap_no_ehr_integration_clinical_data_for);
app.use('/api/gap-no-payer-api-integration-real-time', route_gap_no_payer_api_integration_real_time);
app.use('/api/gap-no-appeal-workflow-automation', route_gap_no_appeal_workflow_automation);
app.use('/api/gap-no-provider-credential-verification', route_gap_no_provider_credential_verification);
app.use('/api/gap-no-notification-engine-0-references', route_gap_no_notification_engine_0_references);
app.use('/api/gap-no-webhook-surface-for-payer-event', route_gap_no_webhook_surface_for_payer_event);
app.use('/api/gap-no-file-upload-for-clinical-notes', route_gap_no_file_upload_for_clinical_notes);

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
