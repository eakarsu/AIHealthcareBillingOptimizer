const express = require('express');
const auth = require('../middleware/auth');
const aiRateLimiter = require('../middleware/aiRateLimit');
const { callOpenRouter } = require('../services/ai');

const router = express.Router();

const integrations = [
  {
    slug: 'clearinghouse-edi',
    name: 'Clearinghouse EDI',
    category: 'Claims and Remits',
    priority: 'Critical',
    status: 'Prepared',
    purpose: 'Submit 837 claims, receive 999/277CA acknowledgements, ingest 835 remits, and support 276/277 claim status.',
    requiredEnv: [
      'CLEARINGHOUSE_BASE_URL',
      'CLEARINGHOUSE_CLIENT_ID',
      'CLEARINGHOUSE_CLIENT_SECRET',
      'CLEARINGHOUSE_SFTP_HOST',
      'CLEARINGHOUSE_SFTP_USERNAME',
      'CLEARINGHOUSE_SFTP_PRIVATE_KEY_PATH',
    ],
    workflows: ['837P/837I submission', '999/277CA acknowledgement intake', '835 ERA import', '276/277 claim status polling'],
    dataDependencies: ['claims', 'providers', 'patients', 'payer_contracts', 'payments', 'denials'],
    testScenarios: ['clean claim accepted', 'claim rejected for missing subscriber data', 'partial ERA payment', 'claim status pending payer review'],
  },
  {
    slug: 'payer-api',
    name: 'Payer API and Portal Automation',
    category: 'Payer Connectivity',
    priority: 'Critical',
    status: 'Prepared',
    purpose: 'Check eligibility, claim status, prior authorization status, document requirements, and portal fallback tasks.',
    requiredEnv: [
      'PAYER_API_BASE_URL',
      'PAYER_API_CLIENT_ID',
      'PAYER_API_CLIENT_SECRET',
      'PAYER_PORTAL_VAULT_REF',
    ],
    workflows: ['eligibility lookup', 'claim status lookup', 'prior-auth status lookup', 'document upload workqueue'],
    dataDependencies: ['insurance_verifications', 'claims', 'prior_authorizations', 'patients'],
    testScenarios: ['active coverage', 'inactive coverage', 'claim not found', 'prior-auth pending additional documentation'],
  },
  {
    slug: 'ehr-fhir-hl7',
    name: 'EHR FHIR/HL7 Clinical Feed',
    category: 'Clinical Data',
    priority: 'Critical',
    status: 'Prepared',
    purpose: 'Import encounters, diagnoses, procedures, clinical notes, labs, and supporting evidence for billing workflows.',
    requiredEnv: [
      'FHIR_BASE_URL',
      'FHIR_CLIENT_ID',
      'FHIR_CLIENT_SECRET',
      'FHIR_TOKEN_URL',
      'HL7_INGESTION_ENDPOINT_SECRET',
    ],
    workflows: ['FHIR patient sync', 'encounter import', 'clinical evidence fetch', 'HL7 ADT/ORM ingestion'],
    dataDependencies: ['patients', 'claims', 'prior_authorizations', 'coding_optimizations'],
    testScenarios: ['new encounter imported', 'updated diagnosis merged', 'clinical note attached to appeal', 'duplicate HL7 message ignored'],
  },
  {
    slug: 'document-storage',
    name: 'Secure Document Storage',
    category: 'Documents',
    priority: 'High',
    status: 'Prepared',
    purpose: 'Store clinical notes, payer letters, appeal packets, EOBs, remits, and claim attachments with audit evidence.',
    requiredEnv: [
      'DOCUMENT_STORAGE_PROVIDER',
      'DOCUMENT_STORAGE_BUCKET',
      'DOCUMENT_STORAGE_REGION',
      'DOCUMENT_STORAGE_KMS_KEY_ID',
    ],
    workflows: ['upload evidence', 'generate signed download URL', 'attach document to claim/denial/prior-auth', 'retention review'],
    dataDependencies: ['claims', 'denials', 'prior_authorizations', 'audit_trail'],
    testScenarios: ['PDF upload accepted', 'invalid file rejected', 'signed URL expires', 'document linked to appeal packet'],
  },
  {
    slug: 'payment-processor',
    name: 'Patient Payment Processor',
    category: 'Patient Billing',
    priority: 'High',
    status: 'Prepared',
    purpose: 'Collect patient balances, tokenize payment methods, process refunds, and reconcile patient payments.',
    requiredEnv: [
      'PAYMENT_PROCESSOR_BASE_URL',
      'PAYMENT_PROCESSOR_PUBLIC_KEY',
      'PAYMENT_PROCESSOR_SECRET_KEY',
      'PAYMENT_WEBHOOK_SECRET',
    ],
    workflows: ['payment intent creation', 'payment webhook reconciliation', 'refund request', 'failed payment follow-up'],
    dataDependencies: ['patients', 'payments', 'aging_reports', 'audit_trail'],
    testScenarios: ['successful card payment', 'failed payment', 'refund completed', 'duplicate webhook ignored'],
  },
  {
    slug: 'notification-delivery',
    name: 'Notification Delivery',
    category: 'Communications',
    priority: 'High',
    status: 'Prepared',
    purpose: 'Send patient/staff email, SMS, fax, and webhook notifications with retries, consent checks, and delivery evidence.',
    requiredEnv: [
      'EMAIL_PROVIDER_API_KEY',
      'SMS_PROVIDER_API_KEY',
      'FAX_PROVIDER_API_KEY',
      'NOTIFICATION_WEBHOOK_SECRET',
    ],
    workflows: ['claim task alert', 'patient balance reminder', 'prior-auth follow-up', 'appeal deadline escalation'],
    dataDependencies: ['patients', 'claims', 'denials', 'prior_authorizations', 'audit_trail'],
    testScenarios: ['email delivered', 'SMS opt-out respected', 'fax retry scheduled', 'webhook delivery failed then retried'],
  },
  {
    slug: 'identity-sso',
    name: 'Enterprise Identity SSO',
    category: 'Security',
    priority: 'Critical',
    status: 'Prepared',
    purpose: 'Support SAML/OIDC SSO, MFA policy, role mapping, access review, and break-glass account controls.',
    requiredEnv: [
      'OIDC_ISSUER_URL',
      'OIDC_CLIENT_ID',
      'OIDC_CLIENT_SECRET',
      'SAML_METADATA_URL',
    ],
    workflows: ['OIDC login', 'role mapping', 'MFA enforcement', 'access review export'],
    dataDependencies: ['users', 'audit_trail'],
    testScenarios: ['SSO login succeeds', 'missing role denied', 'expired session rejected', 'break-glass access audited'],
  },
  {
    slug: 'external-webhooks',
    name: 'External Webhook Platform',
    category: 'Developer Platform',
    priority: 'Medium',
    status: 'Prepared',
    purpose: 'Publish billing events to partner systems and receive payer/clearinghouse asynchronous events safely.',
    requiredEnv: [
      'WEBHOOK_SIGNING_SECRET',
      'WEBHOOK_RETRY_MAX_ATTEMPTS',
      'WEBHOOK_DELIVERY_TIMEOUT_MS',
    ],
    workflows: ['event subscription', 'delivery signing', 'retry and dead-letter', 'inbound event verification'],
    dataDependencies: ['claims', 'payments', 'denials', 'audit_trail'],
    testScenarios: ['signed delivery accepted', 'invalid signature rejected', 'retry after 500 response', 'dead-letter after max attempts'],
  },
  {
    slug: 'openrouter-ai',
    name: 'OpenRouter AI',
    category: 'AI',
    priority: 'High',
    status: 'Prepared',
    purpose: 'Run denial, coding, appeal, prior-auth, contract, and gap-analysis intelligence while preserving auditability.',
    requiredEnv: [
      'OPENROUTER_API_KEY',
      'OPENROUTER_MODEL',
    ],
    workflows: ['AI action execution', 'prompt/version capture', 'result persistence', 'human review queue'],
    dataDependencies: ['ai_analysis_results', 'claims', 'denials', 'payer_contracts', 'compliance_records'],
    testScenarios: ['model returns structured JSON', 'missing API key shows safe error', 'rate limit enforced', 'AI result persisted'],
  },
  {
    slug: 'observability',
    name: 'Observability and Incident Response',
    category: 'Operations',
    priority: 'High',
    status: 'Prepared',
    purpose: 'Track connector health, queue depth, job failures, audit anomalies, latency, and production incidents.',
    requiredEnv: [
      'OBSERVABILITY_DSN',
      'LOG_EXPORT_ENDPOINT',
      'ALERT_WEBHOOK_URL',
    ],
    workflows: ['structured logging', 'error capture', 'connector health checks', 'alert routing'],
    dataDependencies: ['audit_trail'],
    testScenarios: ['backend error captured', 'connector failure alert created', 'PHI-safe log redaction', 'incident runbook linked'],
  },
];

function findIntegration(slug) {
  return integrations.find(item => item.slug === slug);
}

router.get('/', auth, (_req, res) => {
  const categories = Array.from(new Set(integrations.map(item => item.category))).sort();
  res.json({ data: integrations, total: integrations.length, categories });
});

router.get('/:slug', auth, (req, res) => {
  const integration = findIntegration(req.params.slug);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  res.json(integration);
});

router.get('/:slug/readiness', auth, (req, res) => {
  const integration = findIntegration(req.params.slug);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });

  res.json({
    slug: integration.slug,
    status: 'not_checked',
    message: 'Credential values are intentionally not inspected by this endpoint. Configure the listed environment variables before live connector testing.',
    requiredEnv: integration.requiredEnv.map(name => ({ name, status: 'not_checked' })),
    workflows: integration.workflows,
    testScenarios: integration.testScenarios,
  });
});

router.post('/:slug/plan', auth, aiRateLimiter, async (req, res) => {
  try {
    const integration = findIntegration(req.params.slug);
    if (!integration) return res.status(404).json({ error: 'Integration not found' });

    const context = req.body?.context || '';
    const systemPrompt = 'You are a senior healthcare integration architect. Return practical JSON with architecture, setup_steps, data_mapping, security_controls, failure_modes, test_plan, rollout_plan, and go_live_checklist.';
    const userPrompt = `Prepare this integration for a healthcare billing optimizer.

Integration: ${integration.name}
Category: ${integration.category}
Priority: ${integration.priority}
Purpose: ${integration.purpose}
Workflows: ${integration.workflows.join(', ')}
Required env names: ${integration.requiredEnv.join(', ')}
Data dependencies: ${integration.dataDependencies.join(', ')}
Test scenarios: ${integration.testScenarios.join(', ')}
Additional context: ${context || 'No extra context provided.'}

Do not ask for credential values. Describe how to configure, validate, test with sandbox data, and safely roll out.`;

    const response = await callOpenRouter(systemPrompt, userPrompt);
    if (response.error && response.fallback) {
      return res.status(503).json({ error: response.error });
    }

    res.status(201).json({
      integration: integration.slug,
      title: integration.name,
      category: integration.category,
      result: response.result || response.raw || response,
      model: response.model,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
