const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const aiRateLimiter = require('../middleware/aiRateLimit');
const { callOpenRouter } = require('../services/ai');

const router = express.Router();

const resources = [
  {
    key: 'claims',
    label: 'Claims Management',
    table: 'claims',
    apiPath: '/api/claims',
    aliases: ['claim', 'claims', '837', 'submission'],
    columns: ['patient_name', 'patient_dob', 'insurance_id', 'provider_name', 'service_date', 'cpt_code', 'icd_code', 'billed_amount', 'allowed_amount', 'paid_amount', 'status', 'denial_reason', 'submission_date'],
    defaults: {
      patient_name: 'Sample Patient',
      provider_name: 'Sample Provider',
      service_date: new Date().toISOString().slice(0, 10),
      cpt_code: '99213',
      icd_code: 'I10',
      billed_amount: 185,
      allowed_amount: 0,
      paid_amount: 0,
      status: 'submitted',
    },
  },
  {
    key: 'patients',
    label: 'Patient Billing',
    table: 'patients',
    apiPath: '/api/patients',
    aliases: ['patient', 'patients'],
    columns: ['first_name', 'last_name', 'dob', 'insurance_provider', 'insurance_id', 'phone', 'email', 'address', 'balance_due'],
    defaults: {
      first_name: 'Sample',
      last_name: 'Patient',
      insurance_provider: 'Sample Payer',
      insurance_id: `POL-${Date.now()}`,
      balance_due: 0,
    },
  },
  {
    key: 'denials',
    label: 'Denial Management',
    table: 'denials',
    apiPath: '/api/denials',
    aliases: ['denial', 'denials', 'appeal'],
    columns: ['claim_id', 'denial_code', 'denial_reason', 'denial_date', 'appeal_status', 'appeal_date', 'resolution', 'revenue_impact'],
    defaults: {
      denial_code: 'CO-16',
      denial_reason: 'Claim lacks information needed for adjudication.',
      denial_date: new Date().toISOString().slice(0, 10),
      appeal_status: 'none',
      revenue_impact: 185,
    },
  },
  {
    key: 'payments',
    label: 'Payment Tracking',
    table: 'payments',
    apiPath: '/api/payments',
    aliases: ['payment', 'payments', 'cash', 'refund'],
    columns: ['claim_id', 'patient_id', 'amount', 'payment_date', 'payment_method', 'reference_number', 'status'],
    defaults: {
      amount: 100,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'manual',
      reference_number: `CHAT-${Date.now()}`,
      status: 'completed',
    },
  },
  {
    key: 'providers',
    label: 'Provider Management',
    table: 'providers',
    apiPath: '/api/providers',
    aliases: ['provider', 'providers', 'doctor', 'physician'],
    columns: ['name', 'npi', 'specialty', 'tax_id', 'address', 'phone', 'email', 'contract_rate'],
    defaults: {
      name: 'Sample Provider',
      specialty: 'Internal Medicine',
      contract_rate: 100,
    },
  },
  {
    key: 'insurance',
    label: 'Insurance Verification',
    table: 'insurance_verifications',
    apiPath: '/api/insurance-verifications',
    aliases: ['insurance', 'eligibility', 'coverage', 'verification', '270', '271'],
    columns: ['patient_id', 'insurance_provider', 'policy_number', 'group_number', 'verification_date', 'status', 'coverage_details', 'copay', 'deductible', 'deductible_met'],
    defaults: {
      insurance_provider: 'Sample Payer',
      policy_number: `POL-${Date.now()}`,
      verification_date: new Date().toISOString().slice(0, 10),
      status: 'pending',
      coverage_details: 'Sample eligibility verification created from chatbot.',
      copay: 0,
      deductible: 0,
      deductible_met: 0,
    },
  },
  {
    key: 'priorAuth',
    label: 'Prior Authorization',
    table: 'prior_authorizations',
    apiPath: '/api/prior-authorizations',
    aliases: ['prior auth', 'prior authorization', 'authorization', 'auth', 'irt'],
    columns: ['patient_id', 'provider_id', 'service_description', 'cpt_code', 'icd_code', 'status', 'auth_number', 'submit_date', 'decision_date', 'expiry_date', 'notes'],
    defaults: {
      service_description: 'Sample prior authorization request',
      cpt_code: '70551',
      icd_code: 'G43.909',
      status: 'pending',
      submit_date: new Date().toISOString().slice(0, 10),
      notes: 'Created from chatbot.',
    },
  },
  {
    key: 'compliance',
    label: 'Compliance Monitoring',
    table: 'compliance_records',
    apiPath: '/api/compliance',
    aliases: ['compliance', 'hipaa', 'rule', 'rules'],
    columns: ['rule_name', 'category', 'description', 'status', 'last_audit_date', 'next_audit_date', 'findings', 'risk_level'],
    defaults: {
      rule_name: 'Sample Compliance Rule',
      category: 'HIPAA',
      description: 'Sample compliance record created from chatbot.',
      status: 'review',
      risk_level: 'medium',
    },
  },
  {
    key: 'contracts',
    label: 'Payer Contracts',
    table: 'payer_contracts',
    apiPath: '/api/payer-contracts',
    aliases: ['contract', 'contracts', 'payer contract', 'payer contracts'],
    columns: ['payer_name', 'contract_number', 'start_date', 'end_date', 'fee_schedule_type', 'reimbursement_rate', 'terms', 'status'],
    defaults: {
      payer_name: 'Sample Payer',
      contract_number: `CON-${Date.now()}`,
      fee_schedule_type: 'Medicare percentage',
      reimbursement_rate: 100,
      terms: 'Sample payer contract created from chatbot.',
      status: 'active',
    },
  },
  {
    key: 'aging',
    label: 'Aging Reports',
    table: 'aging_reports',
    apiPath: '/api/aging-reports',
    aliases: ['aging', 'ar', 'a/r', 'collections'],
    columns: ['patient_id', 'claim_id', 'amount', 'aging_bucket', 'days_outstanding', 'last_action', 'last_action_date'],
    defaults: {
      amount: 1200,
      aging_bucket: '31-60',
      days_outstanding: 45,
      last_action: 'Created from chatbot.',
      last_action_date: new Date().toISOString().slice(0, 10),
    },
  },
  {
    key: 'coding',
    label: 'Coding Optimization',
    table: 'coding_optimizations',
    apiPath: '/api/coding-optimizations',
    aliases: ['coding', 'code', 'cpt', 'icd'],
    columns: ['claim_id', 'original_cpt', 'suggested_cpt', 'original_icd', 'suggested_icd', 'potential_revenue_change', 'ai_confidence', 'recommendation', 'status'],
    defaults: {
      original_cpt: '99213',
      suggested_cpt: '99214',
      original_icd: 'I10',
      suggested_icd: 'I10',
      potential_revenue_change: 35,
      ai_confidence: 75,
      recommendation: 'Sample coding optimization created from chatbot.',
      status: 'pending',
    },
  },
];

const readOnlyApis = [
  { key: 'analytics', label: 'Analytics', apiPath: '/api/analytics/dashboard', aliases: ['dashboard', 'analytics', 'metrics', 'revenue summary', 'summary'] },
  { key: 'audit', label: 'Audit Trail', apiPath: '/api/audit-trail', aliases: ['audit', 'audit trail', 'logs', 'activity'] },
  { key: 'featureGaps', label: 'Production Gaps', apiPath: '/api/feature-gaps', aliases: ['gap', 'gaps', 'missing feature', 'production gap'] },
  { key: 'integrations', label: 'Integrations', apiPath: '/api/integrations', aliases: ['integration', 'integrations', 'connector', 'connectors'] },
  { key: 'aiAnalysis', label: 'AI Analysis History', apiPath: '/api/ai-analysis', aliases: ['ai analysis', 'ai result', 'analysis history'] },
];

let tablesReady = false;
async function ensureChatTables() {
  if (tablesReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chatbot_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      role VARCHAR(20) NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chatbot_api_calls (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      chatbot_message_id INTEGER REFERENCES chatbot_messages(id) ON DELETE SET NULL,
      method VARCHAR(10) NOT NULL,
      path VARCHAR(255) NOT NULL,
      resource VARCHAR(100),
      request JSONB,
      response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  tablesReady = true;
}

function textIncludes(text, alias) {
  return text.includes(alias.toLowerCase());
}

function findResources(message) {
  const text = message.toLowerCase();
  const matched = resources.filter(resource => resource.aliases.some(alias => textIncludes(text, alias)));
  return matched.length ? matched : [];
}

function findReadOnlyApis(message) {
  const text = message.toLowerCase();
  return readOnlyApis.filter(api => api.aliases.some(alias => textIncludes(text, alias)));
}

function wantsCreate(message) {
  return /\b(add|create|insert|new|make|record|save)\b/i.test(message);
}

function wantsUpdateOrDelete(message) {
  return /\b(update|edit|change|delete|remove)\b/i.test(message);
}

function wantsCapabilityOverview(message) {
  return /\b(what can you do|what does the app provide|everything app provides|app provides|capabilities|features|modules|help)\b/i.test(message);
}

function appCapabilityResponse() {
  return {
    modules: resources.map(resource => ({
      name: resource.label,
      key: resource.key,
      actions: ['read', 'create'],
      examples: [
        `show latest ${resource.aliases[0]}`,
        `create ${resource.aliases[0]} {"field":"value"}`,
      ],
    })),
    readOnlyModules: readOnlyApis.map(api => ({
      name: api.label,
      key: api.key,
      actions: ['read', 'summarize'],
    })),
    guardedActions: [
      'Edit and delete are intentionally guided to the row popup so the user can review before changing records.',
    ],
  };
}

function extractJsonObject(message) {
  const start = message.indexOf('{');
  const end = message.lastIndexOf('}');
  if (start === -1 || end <= start) return {};
  try {
    return JSON.parse(message.slice(start, end + 1));
  } catch (e) {
    return {};
  }
}

function pickData(resource, message) {
  const parsed = extractJsonObject(message);
  const data = { ...resource.defaults, ...parsed };

  resource.columns.forEach((column) => {
    const pattern = new RegExp(`${column}\\s*[:=]\\s*([^,\\n]+)`, 'i');
    const match = message.match(pattern);
    if (match) data[column] = match[1].trim();
  });

  return Object.fromEntries(
    Object.entries(data).filter(([key]) => resource.columns.includes(key))
  );
}

async function insertResource(resource, message) {
  const data = pickData(resource, message);
  const columns = Object.keys(data).filter(key => resource.columns.includes(key));
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const values = columns.map(column => data[column]);
  const result = await pool.query(
    `INSERT INTO ${resource.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  );
  return {
    method: 'POST',
    path: resource.apiPath,
    resource: resource.label || resource.key,
    request: data,
    response: result.rows[0],
  };
}

async function readResource(resource, limit = 10) {
  const result = await pool.query(`SELECT * FROM ${resource.table} ORDER BY created_at DESC LIMIT $1`, [limit]);
  return {
    method: 'GET',
    path: `${resource.apiPath}?limit=${limit}`,
    resource: resource.label || resource.key,
    request: { limit },
    response: result.rows,
  };
}

async function readRegisteredApi(api) {
  if (api.key === 'analytics') {
    const [claims, denials, payments, aging] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(billed_amount),0)::float AS billed FROM claims').catch(() => ({ rows: [{}] })),
      pool.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(revenue_impact),0)::float AS impact FROM denials').catch(() => ({ rows: [{}] })),
      pool.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0)::float AS paid FROM payments').catch(() => ({ rows: [{}] })),
      pool.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0)::float AS outstanding FROM aging_reports').catch(() => ({ rows: [{}] })),
    ]);
    return {
      method: 'GET',
      path: api.apiPath,
      resource: api.label || api.key,
      request: {},
      response: {
        claims: claims.rows[0],
        denials: denials.rows[0],
        payments: payments.rows[0],
        aging: aging.rows[0],
      },
    };
  }

  const tableByKey = {
    audit: 'audit_trail',
    featureGaps: null,
    integrations: null,
    aiAnalysis: 'ai_analysis_results',
  };

  if (api.key === 'featureGaps') {
    return { method: 'GET', path: api.apiPath, resource: api.label || api.key, request: {}, response: { message: 'Production gaps are available in the Production Gaps app module.' } };
  }
  if (api.key === 'integrations') {
    return { method: 'GET', path: api.apiPath, resource: api.label || api.key, request: {}, response: { message: 'Integration readiness is available in the Integrations app module.' } };
  }

  const table = tableByKey[api.key];
  const result = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 10`).catch(() => ({ rows: [] }));
  return { method: 'GET', path: `${api.apiPath}?limit=10`, resource: api.label || api.key, request: { limit: 10 }, response: result.rows };
}

async function logApiCall(userId, messageId, call) {
  await pool.query(
    `INSERT INTO chatbot_api_calls (user_id, chatbot_message_id, method, path, resource, request, response)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [userId, messageId, call.method, call.path, call.resource, call.request || {}, call.response || {}]
  );
}

function fallbackAnswer(message, calls) {
  const createCalls = calls.filter(call => call.method === 'POST');
  const readCalls = calls.filter(call => call.method === 'GET');
  const parts = [];

  if (createCalls.length) {
    parts.push(`Created ${createCalls.length} record${createCalls.length === 1 ? '' : 's'} in ${createCalls.map(call => call.resource).join(', ')}.`);
  }
  if (readCalls.length) {
    parts.push(`Reviewed ${readCalls.map(call => call.resource).join(', ')}.`);
  }
  if (!parts.length) {
    parts.push('I can help with Claims Management, Denial Management, Patient Billing, Payment Tracking, Provider Management, Insurance Verification, Prior Authorization, Compliance Monitoring, Payer Contracts, Aging Reports, Coding Optimization, Analytics, Audit Trail, Integrations, and Production Gaps.');
  }
  parts.push('Ask me to show records, summarize a module, or create a record using app fields in JSON.');
  return parts.join(' ');
}

async function produceAnswer(message, calls) {
  const response = await callOpenRouter(
    'You are an in-app assistant for a healthcare billing optimizer. Explain app data in clear business language. Speak in terms of app modules, screens, records, and actions. Do not mention raw SQL, database tables, internal table names, or implementation details. If records were created, say what was created and where the user can review it.',
    `User request: ${message}

App actions executed:
${JSON.stringify(calls.map(call => ({ action: call.method, module: call.resource, result: call.response })), null, 2)}

Write a concise answer with useful next steps.`
  );

  if (response.error && response.fallback) {
    return fallbackAnswer(message, calls);
  }
  return typeof response.result === 'string' ? response.result : JSON.stringify(response.result, null, 2);
}

router.get('/history', auth, async (req, res) => {
  try {
    await ensureChatTables();
    const result = await pool.query(
      'SELECT * FROM chatbot_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ data: result.rows.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/message', auth, aiRateLimiter, async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'message is required' });
    await ensureChatTables();

    const insertedMessage = await pool.query(
      'INSERT INTO chatbot_messages (user_id, role, message, metadata) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, 'user', message, {}]
    );
    const messageId = insertedMessage.rows[0].id;

    const calls = [];
    const matchedResources = findResources(message);

    if (wantsCapabilityOverview(message)) {
      calls.push({
        method: 'GET',
        path: '/api/app-capabilities',
        resource: 'App Capabilities',
        request: {},
        response: appCapabilityResponse(),
      });
    } else if (wantsUpdateOrDelete(message)) {
      calls.push({
        method: 'GUIDE',
        path: '/api/*',
        resource: 'Guided Edit/Delete',
        request: { message },
        response: { message: 'For updates/deletes, open the specific row popup and use Edit/Delete so the user can review the record before changing it.' },
      });
    } else if (wantsCreate(message) && matchedResources.length) {
      for (const resource of matchedResources.slice(0, 3)) {
        calls.push(await insertResource(resource, message));
      }
    } else if (matchedResources.length) {
      for (const resource of matchedResources.slice(0, 4)) {
        calls.push(await readResource(resource));
      }
    } else {
      const apiMatches = findReadOnlyApis(message);
      if (apiMatches.length) {
        for (const api of apiMatches.slice(0, 4)) {
          calls.push(await readRegisteredApi(api));
        }
      } else {
        calls.push(await readRegisteredApi(readOnlyApis[0]));
        calls.push(await readResource(resources[0], 5));
        calls.push(await readResource(resources[2], 5));
      }
    }

    for (const call of calls) {
      await logApiCall(req.user.id, messageId, call);
    }

    const answer = await produceAnswer(message, calls);
    const insertedAssistant = await pool.query(
      'INSERT INTO chatbot_messages (user_id, role, message, metadata) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, 'assistant', answer, { calls: calls.map(call => ({ method: call.method, path: call.path, resource: call.resource })) }]
    );

    res.status(201).json({
      answer,
      calls: calls.map(call => ({ method: call.method, path: call.path, resource: call.resource, response: call.response })),
      message: insertedAssistant.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Chatbot failed' });
  }
});

module.exports = router;
