import React, { useState } from 'react';
import './ProductionWorkspace.css';

const controls = [
  ['Enterprise Identity & Access', 'Security', 'SSO/MFA rollout, role mapping, access reviews, and break-glass owner tracking', 'In progress'],
  ['EDI Connector Operations', 'Integrations', '837, 835, 270/271, 276/277, SFTP, acknowledgements, and retry queue ownership', 'Ready for credentials'],
  ['Payer Portal Workbench', 'Integrations', 'Portal credential status, status polling, document upload, screenshots, and manual fallback', 'Ready for pilot'],
  ['HIPAA Audit Export Center', 'Compliance', 'PHI access logs, claim decisions, payment changes, denial actions, and evidence package exports', 'Implemented surface'],
  ['Notification Delivery Ledger', 'Platform', 'Email, SMS, fax, webhook, failed retry, patient update, and escalation tracking', 'Implemented surface'],
  ['Observability & Runbooks', 'Operations', 'Connector health, job failures, queue depth, alert thresholds, support ownership, and runbooks', 'Implemented surface'],
  ['Release Test Harness', 'Quality', 'Billing smoke tests, claim workflow regression, permission checks, and browser release gates', 'Implemented surface'],
];

export default function ProductionControlsPage() {
  const [selected, setSelected] = useState(controls[0]);

  return (
    <div className="workspace-page">
      <div className="page-header">
        <div>
          <h1>Production Controls</h1>
          <p>Operational features required to run the billing optimizer as a production revenue-cycle system.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="metric-card"><span>Controls</span><strong>{controls.length}</strong><small>Production workspaces</small></div>
        <div className="metric-card"><span>Critical Path</span><strong>EDI</strong><small>Claims and remits</small></div>
        <div className="metric-card"><span>Launch Gate</span><strong>Active</strong><small>Tests and audit evidence</small></div>
      </div>

      <div className="content-card selected-summary">
        <div>
          <h2>{selected[0]}</h2>
          <p>{selected[2]}</p>
          <div className="summary-meta">
            <span className="badge badge-blue">Domain: {selected[1]}</span>
            <span className="badge badge-yellow">{selected[3]}</span>
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
            {controls.map((row) => (
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
