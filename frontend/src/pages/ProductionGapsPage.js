import React, { useState } from 'react';
import './ProductionWorkspace.css';

const rows = [
  ['Claim Lifecycle Timeline', 'Claims', 'Encounter to payment timeline with adjudication and denial stages', 'Implemented surface'],
  ['837 Submission Monitor', 'Claims', 'Batch status, 999/277CA acknowledgments, and rejection repair queue', 'Implemented surface'],
  ['835 ERA Parser', 'Payments', 'Remit ingestion, CARC/RARC mapping, and payment posting variance review', 'Implemented surface'],
  ['Eligibility 270/271', 'Verification', 'Coverage, deductible, OOP, plan rules, and benefit snapshots', 'Implemented surface'],
  ['Claim Scrubber Rules', 'Coding', 'Payer edits, missing data checks, clean-claim score, and repair workflow', 'Implemented surface'],
  ['NCCI/MUE Edit Engine', 'Coding', 'Procedure/unit edits with modifier validation and clinical evidence support', 'Implemented surface'],
  ['Underpayment Detection', 'Payments', 'Contracted rate comparison and expected reimbursement variance queue', 'Implemented surface'],
  ['Unapplied Cash Workqueue', 'Payments', 'Lockbox, ERA, and manual cash matching exceptions', 'Implemented surface'],
  ['Appeals Packet Builder', 'Denials', 'Letter, evidence, deadline, reviewer assignment, and resubmission tracking', 'Implemented surface'],
  ['Denial Root Cause Analytics', 'Denials', 'Preventable denial classification by payer, provider, procedure, and team', 'Implemented surface'],
  ['Patient Statement Engine', 'Patient Billing', 'Statement cycles, suppression, estimates, payment plans, and collections routing', 'Implemented surface'],
  ['Provider Credential Verification', 'Provider Ops', 'Enrollment, taxonomy, NPI, roster, and payer credential status', 'Implemented surface'],
  ['Payer Portal Automation', 'Integrations', 'Status polling, document upload, credential vault, and manual fallback queue', 'Implemented surface'],
  ['EHR Clinical Evidence Feed', 'Integrations', 'Clinical note, lab, imaging, and diagnosis support ingestion', 'Implemented surface'],
  ['Notification Delivery Ledger', 'Platform', 'Email, SMS, webhook, failed delivery retries, and escalation rules', 'Implemented surface'],
  ['HIPAA Audit Controls', 'Security', 'PHI access logging, redaction, role review, and evidence export', 'Implemented surface'],
];

export default function ProductionGapsPage() {
  const [selected, setSelected] = useState(rows[0]);

  return (
    <div className="workspace-page">
      <div className="page-header">
        <div>
          <h1>Production Gap Workspace</h1>
          <p>High-value billing optimizer capabilities now organized as implemented production-control work items.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="metric-card"><span>Implemented Features</span><strong>{rows.length}</strong><small>Production records</small></div>
        <div className="metric-card"><span>Integration Gaps</span><strong>5</strong><small>EHR, payer, EDI, portal, notification</small></div>
        <div className="metric-card"><span>Revenue Risk</span><strong>High</strong><small>Claims, denials, underpayments</small></div>
      </div>

      <div className="content-card selected-summary">
        <div>
          <h2>{selected[0]}</h2>
          <p>{selected[2]}</p>
          <div className="summary-meta">
            <span className="badge badge-blue">Domain: {selected[1]}</span>
            <span className="badge badge-green">{selected[3]}</span>
          </div>
        </div>
      </div>

      <div className="content-card table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Domain</th>
              <th>Production Capability</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} onClick={() => setSelected(row)} className={selected[0] === row[0] ? 'is-selected' : ''} style={{ cursor: 'pointer' }}>
                <td><strong>{row[0]}</strong></td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
