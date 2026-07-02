const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const aiRateLimiter = require('../middleware/aiRateLimit');
const { callOpenRouter } = require('../services/ai');

const router = express.Router();

const featureGaps = [
  {
    slug: 'edi-837-submission-monitor',
    name: '837 EDI Submission Monitor',
    domain: 'Claims',
    severity: 'Critical',
    status: 'Gap',
    capability: 'Batch 837 generation, clearinghouse submission, 999/277CA acknowledgement tracking, rejection repair, and resubmission queue.',
  },
  {
    slug: 'era-835-parser-payment-posting',
    name: '835 ERA Parser and Payment Posting',
    domain: 'Payments',
    severity: 'Critical',
    status: 'Gap',
    capability: '835 remit ingestion, CARC/RARC mapping, contractual adjustment logic, payment posting, and variance review.',
  },
  {
    slug: 'eligibility-270-271-connector',
    name: '270/271 Eligibility Connector',
    domain: 'Verification',
    severity: 'Critical',
    status: 'Gap',
    capability: 'Real-time eligibility checks, benefit snapshots, deductible/OOP status, plan limits, and payer response history.',
  },
  {
    slug: 'claim-status-276-277-connector',
    name: '276/277 Claim Status Connector',
    domain: 'Claims',
    severity: 'High',
    status: 'Gap',
    capability: 'Real payer claim-status polling, status normalization, exception workqueues, and patient-account timeline updates.',
  },
  {
    slug: 'claim-scrubber-payer-edit-engine',
    name: 'Claim Scrubber and Payer Edit Engine',
    domain: 'Coding',
    severity: 'Critical',
    status: 'Gap',
    capability: 'Clean-claim scoring, payer-specific edits, missing-data checks, modifier validation, and repair workflow before submission.',
  },
  {
    slug: 'ncci-mue-medical-necessity-edits',
    name: 'NCCI/MUE and Medical Necessity Edits',
    domain: 'Coding',
    severity: 'High',
    status: 'Gap',
    capability: 'Procedure/unit edits, bundling checks, modifier justification, LCD/NCD medical necessity matching, and evidence capture.',
  },
  {
    slug: 'underpayment-detection-contract-variance',
    name: 'Underpayment Detection',
    domain: 'Payments',
    severity: 'High',
    status: 'Gap',
    capability: 'Expected reimbursement calculation, contract variance detection, payer trend analysis, and recovery workqueue.',
  },
  {
    slug: 'unapplied-cash-reconciliation',
    name: 'Unapplied Cash Reconciliation',
    domain: 'Payments',
    severity: 'Medium',
    status: 'Gap',
    capability: 'Lockbox, ERA, and manual cash matching exceptions with ownership, aging, and resolution tracking.',
  },
  {
    slug: 'patient-statement-payment-plan-engine',
    name: 'Patient Statement and Payment Plan Engine',
    domain: 'Patient Billing',
    severity: 'High',
    status: 'Gap',
    capability: 'Statement cycles, suppression rules, estimates, payment plans, collections routing, and patient communication ledger.',
  },
  {
    slug: 'payer-portal-automation-workbench',
    name: 'Payer Portal Automation Workbench',
    domain: 'Integrations',
    severity: 'High',
    status: 'Gap',
    capability: 'Portal credential status, status polling, document upload, evidence screenshots, retry queue, and manual fallback tracking.',
  },
  {
    slug: 'ehr-fhir-hl7-clinical-evidence-feed',
    name: 'EHR/FHIR/HL7 Clinical Evidence Feed',
    domain: 'Integrations',
    severity: 'High',
    status: 'Gap',
    capability: 'Clinical notes, labs, imaging, diagnoses, and encounter context ingestion for coding, appeals, and prior authorization.',
  },
  {
    slug: 'prior-auth-submission-follow-up',
    name: 'Prior Auth Submission and Follow-up',
    domain: 'Verification',
    severity: 'High',
    status: 'Gap',
    capability: 'Payer-specific prior-auth submission, attachment tracking, follow-up tasks, approval/denial capture, and expiry monitoring.',
  },
  {
    slug: 'notification-delivery-ledger',
    name: 'Notification Delivery Ledger',
    domain: 'Platform',
    severity: 'Medium',
    status: 'Gap',
    capability: 'Email, SMS, fax, webhook, failed retries, escalation rules, and delivery evidence for patient and staff workflows.',
  },
  {
    slug: 'enterprise-identity-rbac-mfa',
    name: 'Enterprise Identity, RBAC, and MFA',
    domain: 'Security',
    severity: 'Critical',
    status: 'Gap',
    capability: 'SSO/MFA, fine-grained roles, PHI access boundaries, break-glass workflow, access reviews, and admin controls.',
  },
  {
    slug: 'phi-redaction-audit-export',
    name: 'PHI Redaction and Audit Export',
    domain: 'Compliance',
    severity: 'Critical',
    status: 'Gap',
    capability: 'PHI masking, immutable access logs, audit packages, data-retention rules, and compliance evidence export.',
  },
  {
    slug: 'observability-runbooks-release-gates',
    name: 'Observability, Runbooks, and Release Gates',
    domain: 'Operations',
    severity: 'Medium',
    status: 'Gap',
    capability: 'Connector health, queue depth, job failures, alert thresholds, runbooks, smoke tests, and release regression gates.',
  },
  {
    slug: 'claim-attachment-275-document-management',
    name: '275 Claim Attachments and Document Management',
    domain: 'Claims',
    severity: 'High',
    status: 'Gap',
    capability: 'Document intake, 275 attachment creation, evidence linking, payer-specific document requirements, and attachment delivery tracking.',
  },
  {
    slug: 'workqueue-task-assignment-sla',
    name: 'Workqueues, Task Assignment, and SLA Tracking',
    domain: 'Operations',
    severity: 'High',
    status: 'Gap',
    capability: 'Configurable workqueues, ownership, due dates, escalation rules, team productivity views, and SLA breach tracking.',
  },
  {
    slug: 'background-jobs-retry-scheduler',
    name: 'Background Jobs, Retries, and Scheduler',
    domain: 'Platform',
    severity: 'Critical',
    status: 'Gap',
    capability: 'Durable job execution for payer polling, EDI batches, AI analysis, notifications, retries, backoff, and dead-letter handling.',
  },
  {
    slug: 'tenant-organization-data-isolation',
    name: 'Tenant and Organization Data Isolation',
    domain: 'Security',
    severity: 'Critical',
    status: 'Gap',
    capability: 'Organization-scoped data access, tenant-aware queries, user-to-organization membership, tenant audit evidence, and admin boundaries.',
  },
  {
    slug: 'admin-configuration-payer-rules',
    name: 'Admin Configuration and Payer Rule Catalog',
    domain: 'Platform',
    severity: 'High',
    status: 'Gap',
    capability: 'Admin-maintained payer rules, denial codes, CARC/RARC mappings, claim edits, notification templates, and operational thresholds.',
  },
  {
    slug: 'ai-governance-human-review',
    name: 'AI Governance and Human Review',
    domain: 'AI Governance',
    severity: 'Critical',
    status: 'Gap',
    capability: 'AI output review queues, prompt/version tracking, model selection history, PHI safety checks, confidence gates, and approval workflow.',
  },
  {
    slug: 'secure-file-import-export',
    name: 'Secure File Import and Export',
    domain: 'Integrations',
    severity: 'High',
    status: 'Gap',
    capability: 'CSV/XLSX/EDI import, validation reports, export packages, SFTP drop zones, file-level audit trail, and PHI-safe error handling.',
  },
  {
    slug: 'backup-retention-disaster-recovery',
    name: 'Backup, Retention, and Disaster Recovery',
    domain: 'Operations',
    severity: 'Critical',
    status: 'Gap',
    capability: 'Database backups, restore testing, retention policies, point-in-time recovery, downtime procedures, and evidence for audits.',
  },
  {
    slug: 'contract-versioning-rate-schedules',
    name: 'Contract Versioning and Rate Schedules',
    domain: 'Contracts',
    severity: 'High',
    status: 'Gap',
    capability: 'Versioned payer contracts, fee schedules, effective dates, carve-outs, modifiers, stop-loss terms, and reimbursement simulation.',
  },
  {
    slug: 'charge-capture-encounter-reconciliation',
    name: 'Charge Capture Encounter Reconciliation',
    domain: 'Claims',
    severity: 'High',
    status: 'Gap',
    capability: 'Encounter-to-charge matching, missing charge detection, late charge tracking, clinical evidence links, and department worklists.',
  },
  {
    slug: 'provider-enrollment-credentialing-roster',
    name: 'Provider Enrollment, Credentialing, and Roster Management',
    domain: 'Provider Ops',
    severity: 'High',
    status: 'Gap',
    capability: 'Payer enrollment status, credentialing documents, roster changes, NPI/taxonomy validation, expirations, and follow-up tasks.',
  },
  {
    slug: 'denial-appeal-deadline-evidence-tracker',
    name: 'Denial Appeal Deadline and Evidence Tracker',
    domain: 'Denials',
    severity: 'High',
    status: 'Gap',
    capability: 'Appeal levels, payer deadlines, evidence checklists, letter versions, submission receipts, and overturn tracking.',
  },
  {
    slug: 'patient-estimates-good-faith-estimates',
    name: 'Patient Estimates and Good Faith Estimates',
    domain: 'Patient Billing',
    severity: 'Medium',
    status: 'Gap',
    capability: 'Pre-service estimates, good faith estimate workflow, patient responsibility calculation, disclosure tracking, and variance review.',
  },
  {
    slug: 'patient-payments-refunds-disputes',
    name: 'Patient Payments, Refunds, and Disputes',
    domain: 'Patient Billing',
    severity: 'Medium',
    status: 'Gap',
    capability: 'Patient payment processing, refund workflow, dispute tracking, payment plan status, failed payment handling, and reconciliation.',
  },
  {
    slug: 'reporting-data-warehouse-exports',
    name: 'Reporting Warehouse and Scheduled Exports',
    domain: 'Analytics',
    severity: 'Medium',
    status: 'Gap',
    capability: 'Scheduled operational reports, denormalized analytics tables, payer/provider performance exports, and metric definitions.',
  },
  {
    slug: 'release-testing-seeded-scenarios',
    name: 'Release Testing with Seeded Billing Scenarios',
    domain: 'Quality',
    severity: 'High',
    status: 'Gap',
    capability: 'Regression tests for claim creation, denial appeal, ERA posting, eligibility checks, role permissions, and AI action workflows.',
  },
  {
    slug: 'consent-preferences-communication-compliance',
    name: 'Consent, Preferences, and Communication Compliance',
    domain: 'Compliance',
    severity: 'High',
    status: 'Gap',
    capability: 'Patient communication preferences, SMS/email consent, opt-out handling, contact restrictions, and delivery compliance evidence.',
  },
  {
    slug: 'api-webhook-developer-platform',
    name: 'API, Webhook, and Developer Platform',
    domain: 'Platform',
    severity: 'Medium',
    status: 'Gap',
    capability: 'External API keys, webhook subscriptions, event schemas, retry policies, audit logs, and partner integration documentation.',
  },
];

let tableEnsured = false;
async function ensureGapTable() {
  if (tableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gap_features (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(120),
      input JSONB,
      output JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  tableEnsured = true;
}

function buildSummary() {
  const domains = {};
  const severities = {};

  featureGaps.forEach((gap) => {
    domains[gap.domain] = (domains[gap.domain] || 0) + 1;
    severities[gap.severity] = (severities[gap.severity] || 0) + 1;
  });

  return {
    domains: Object.entries(domains).map(([name, count]) => ({ name, count })),
    severities: Object.entries(severities).map(([name, count]) => ({ name, count })),
  };
}

router.get('/', auth, (_req, res) => {
  res.json({ data: featureGaps, total: featureGaps.length, summary: buildSummary() });
});

router.post('/:slug/analyze', auth, aiRateLimiter, async (req, res) => {
  try {
    const gap = featureGaps.find(item => item.slug === req.params.slug);
    if (!gap) {
      return res.status(404).json({ error: 'Feature gap not found' });
    }

    const context = req.body?.context || '';
    const systemPrompt = 'You are a senior healthcare revenue-cycle product architect. Return practical JSON with summary, implementation_plan, data_model, integrations, risks, test_plan, and next_actions.';
    const userPrompt = `Analyze this missing app capability and produce an implementation plan.

Feature: ${gap.name}
Domain: ${gap.domain}
Severity: ${gap.severity}
Capability needed: ${gap.capability}
Additional context: ${context || 'No extra context provided.'}`;

    const response = await callOpenRouter(systemPrompt, userPrompt);
    if (response.error && response.fallback) {
      return res.status(503).json({ error: response.error });
    }

    const output = {
      feature: gap.slug,
      title: gap.name,
      domain: gap.domain,
      severity: gap.severity,
      result: response.result || response.raw || response,
      model: response.model,
    };

    await ensureGapTable();
    await pool.query(
      'INSERT INTO gap_features (slug, input, output) VALUES ($1, $2, $3)',
      [gap.slug, { gap, context }, output]
    );

    res.status(201).json(output);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
