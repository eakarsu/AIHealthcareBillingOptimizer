const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createWorkflow } = require('../src/governance/workflowCore');
const config = require('../src/governance/config');
const { prioritizeDenials, buildAppealPackage } = require('../src/governance/denialOperations');

const workflow = createWorkflow(config);
const actor = (role, id = 'actor-a') => ({
  tenantId: 'tenant-a',
  idempotencyKey: 'request-a',
  actorId: id,
  role,
});

function expectCode(fn, code) {
  assert.throws(fn, (error) => error && error.code === code);
}

test('workflow configuration is domain-specific and internally consistent', () => {
  assert.ok(config.states.length >= 7);
  assert.ok(config.evidenceKinds.length >= 8);
  assert.ok(config.connectors.length >= 6);
  assert.match(config.professionalBoundary, /not|never|advisory|does not/i);
  assert.equal(new Set(config.states).size, config.states.length);
});

test('authentication context requires tenant, idempotency, actor, and role', () => {
  expectCode(() => workflow.context({}, { id: 'actor-a', role: config.createRoles[0] }), 'TENANT_REQUIRED');
  expectCode(
    () => workflow.context({ 'x-tenant-id': 'tenant-a' }, { id: 'actor-a', role: config.createRoles[0] }),
    'IDEMPOTENCY_REQUIRED'
  );
  assert.deepEqual(
    workflow.context(
      { 'x-tenant-id': 'tenant-a', 'idempotency-key': 'request-a' },
      { id: 'actor-a', role: config.createRoles[0] }
    ),
    actor(config.createRoles[0])
  );
});

test('case intake is versioned, role-gated, and rejects personal fields', () => {
  const input = {
    subjectRef: 'subject-opaque-1',
    policyVersion: 'policy-v1',
    effectiveAt: '2026-07-18T12:00:00Z',
    retentionUntil: '2033-07-18T12:00:00Z',
    sourceSnapshot: { source_ref: 'source-1', source_version: 'source-v2' },
  };
  const item = workflow.createCase(input, actor(config.createRoles[0]));
  assert.equal(item.state, config.initialState);
  assert.equal(item.caseType, config.caseType);
  expectCode(
    () => workflow.createCase({ ...input, sourceSnapshot: { patient_name: 'not-allowed' } }, actor(config.createRoles[0])),
    'SENSITIVE_FIELD_REJECTED'
  );
  expectCode(() => workflow.createCase(input, actor('unauthorized_role')), 'FORBIDDEN');
});

test('evidence is digest-only, typed, and replay-addressable', () => {
  const item = workflow.evidence({
    kind: config.evidenceKinds[0],
    sourceRef: 'vault:artifact-7',
    sourceVersion: 'source-v3',
    sha256: 'a'.repeat(64),
    capturedAt: '2026-07-18T12:00:00Z',
    metadata: { schema_version: 'schema-v1' },
  });
  assert.equal(item.sha256, 'a'.repeat(64));
  expectCode(
    () => workflow.evidence({
      kind: config.evidenceKinds[0],
      sourceRef: 'vault:artifact-7',
      sourceVersion: 'source-v3',
      sha256: 'a'.repeat(64),
      capturedAt: '2026-07-18T12:00:00Z',
      rawContent: 'sensitive',
    }),
    'RAW_CONTENT_REJECTED'
  );
});

test('deterministic assessment fails closed and keeps a human approval boundary', () => {
  const missing = workflow.deterministicAssessment({ policyVersion: 'policy-v1' }, actor(config.assessmentRoles[0]));
  assert.equal(missing.disposition, 'insufficient_evidence');
  assert.equal(missing.automatedDecision, false);
  const result = workflow.deterministicAssessment({ eligibilityStatus:'verified', codeSetVersion:'icd10-2026', coverageVersion:'payer-v8', encounterComplete:true, claimControlNumber:'claim-ref-7', policyVersion:'policy-v6' }, actor(config.assessmentRoles[0]));
  assert.equal(result.disposition, 'certified_coding_review_required');
  assert.equal(result.automatedDecision, false);
  assert.equal(result.requiresHumanReview, true);
  expectCode(() => workflow.deterministicAssessment({ eligibilityStatus:'verified', codeSetVersion:'icd10-2026', coverageVersion:'payer-v8', encounterComplete:true, claimControlNumber:'claim-ref-7', policyVersion:'policy-v6' }, actor('unauthorized_role')), 'FORBIDDEN');
});

test('transition contract rejects stale writes, missing evidence, and unauthorized actors', () => {
  const first = config.transitions[0];
  const record = {
    state: first.from,
    version: 1,
    evidenceCount: 1,
    createdBy: 'creator-other',
    lastActorId: 'prior-other',
  };
  const decision = workflow.transition(
    record,
    { action: first.action, expectedVersion: 1, reason: 'Verified against authoritative evidence.' },
    actor(first.roles[0])
  );
  assert.equal(decision.to, first.to);
  expectCode(
    () => workflow.transition(record, { action: first.action, expectedVersion: 2, reason: 'Stale write is rejected.' }, actor(first.roles[0])),
    'VERSION_CONFLICT'
  );
  expectCode(
    () => workflow.transition({ ...record, evidenceCount: 0 }, { action: first.action, expectedVersion: 1, reason: 'No evidence is present.' }, actor(first.roles[0])),
    'EVIDENCE_REQUIRED'
  );
  expectCode(
    () => workflow.transition(record, { action: first.action, expectedVersion: 1, reason: 'Unauthorized transition attempt.' }, actor('unauthorized_role')),
    'FORBIDDEN'
  );
});

test('dual-control, persistence, tenant-scope, and audit contracts are encoded', () => {
  const dual = config.transitions.find((item) => item.dualControl);
  assert.ok(dual);
  expectCode(
    () => workflow.transition(
      { state: dual.from, version: 4, evidenceCount: 1, createdBy: 'actor-a', lastActorId: 'actor-b' },
      { action: dual.action, expectedVersion: 4, reason: 'Approval requires an independent actor.' },
      actor(dual.roles[0], 'actor-a')
    ),
    'DUAL_CONTROL_REQUIRED'
  );

  const migration = fs.readFileSync(path.join(__dirname, '../migrations/001_governed_workflow.sql'), 'utf8');
  assert.match(migration, /FOREIGN KEY \(tenant_id, case_id\)/);
  assert.match(migration, /UNIQUE \(tenant_id, idempotency_key\)/);
  assert.match(migration, /subject_ref_prefix/);
  assert.match(migration, /governed_events_immutable/);
  assert.match(migration, /governed_case_identity_immutable/);

  const router = fs.readFileSync(path.join(__dirname, '../src/governance/routerFactory.js'), 'utf8');
  assert.match(router, /FOR UPDATE/);
  assert.match(router, /IDEMPOTENCY_PAYLOAD_CONFLICT/);
  assert.match(router, /\/cases\/:id\/history/);
  assert.match(router, /quarantined_until_credentialed_and_contract_tested/);
});

test('denial queue prioritizes deadlines and produces human-approved appeal drafts',()=>{const queue=prioritizeDenials({asOf:'2026-08-30T00:00:00Z',denials:[{claimRef:'late',appealDueAt:'2026-08-29T00:00:00Z',amountMinor:10000},{claimRef:'later',appealDueAt:'2026-10-01T00:00:00Z',amountMinor:500000}]});assert.equal(queue.items[0].claimRef,'late');const packet=buildAppealPackage({claimRef:'late',payerRef:'payer-1',denialReason:'medical necessity',evidenceDigests:['a'.repeat(64)]});assert.equal(packet.status,'draft_requires_human_approval');assert.equal(packet.automaticSubmission,false);});
