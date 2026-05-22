import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { section: 'Overview' },
  { path: '/', label: 'Dashboard', icon: '\ud83d\udcca' },
  { section: 'Billing Operations' },
  { path: '/claims', label: 'Claims Management', icon: '\ud83d\udccb' },
  { path: '/denials', label: 'Denial Management', icon: '\u26d4' },
  { path: '/patients', label: 'Patient Billing', icon: '\ud83d\udc65' },
  { path: '/payments', label: 'Payment Tracking', icon: '\ud83d\udcb3' },
  { path: '/charge-capture-reconciliation', label: 'Charge Capture', icon: '\ud83e\uddee' },
  { path: '/providers', label: 'Provider Management', icon: '\ud83c\udfe5' },
  { section: 'Verification' },
  { path: '/insurance', label: 'Insurance Verification', icon: '\ud83d\udee1\ufe0f' },
  { path: '/prior-auth', label: 'Prior Authorization', icon: '\u2705' },
  { section: 'Compliance & Contracts' },
  { path: '/compliance', label: 'Compliance Monitoring', icon: '\ud83d\udcdc' },
  { path: '/payer-contracts', label: 'Payer Contracts', icon: '\ud83d\uddd3\ufe0f' },
  { section: 'Reports & AI' },
  { path: '/aging-reports', label: 'Aging Reports', icon: '\u23f0' },
  { path: '/coding', label: 'Coding Optimization', icon: '\ud83d\udca1' },
  { path: '/audit-trail', label: 'Audit Trail', icon: '\ud83d\udd0d' },
  { path: '/analytics', label: 'Analytics', icon: '\ud83d\udcc8' },
  { path: '/ai-analysis', label: 'AI Analysis', icon: '\ud83e\udde0' },
  { path: '/advanced-ai', label: 'Advanced AI', icon: '\u26a1' },
  { section: 'Custom' },
  { path: '/custom-views', label: 'Billing Views', icon: '\ud83d\udcca' },
  { section: 'AI Gap Features' },
  { path: '/gap-no-denial-analyzer-predict-reversals-rec', label: 'Denial Analyzer', icon: '\ud83e\udd16' },
  { path: '/gap-no-coding-recommender-suggest-icd-10cpt', label: 'Coding Recommender', icon: '\ud83d\udcdd' },
  { path: '/gap-no-contract-analyzer', label: 'Contract Analyzer', icon: '\ud83d\udcca' },
  { path: '/gap-no-claim-prioritizer', label: 'Claim Prioritizer', icon: '\ud83d\udd22' },
  { path: '/gap-no-compliance-risk-checker', label: 'Compliance Risk Checker', icon: '\u26a0\ufe0f' },
  { path: '/gap-no-prior-auth-approval-likelihood-predic', label: 'Prior Auth Predictor', icon: '\ud83d\udd2e' },
  { path: '/gap-no-ehr-integration-clinical-data-for', label: 'EHR Integration', icon: '\ud83c\udfe5' },
  { path: '/gap-no-payer-api-integration-real-time', label: 'Payer API Integration', icon: '\ud83d\udd0c' },
  { path: '/gap-no-appeal-workflow-automation', label: 'Appeal Workflow', icon: '\ud83d\udd04' },
  { path: '/gap-no-provider-credential-verification', label: 'Provider Credentials', icon: '\u2714\ufe0f' },
  { path: '/gap-no-notification-engine-0-references', label: 'Notification Engine', icon: '\ud83d\udd14' },
  { path: '/gap-no-webhook-surface-for-payer-event', label: 'Webhook Payer Events', icon: '\ud83d\udce1' },
  { path: '/gap-no-file-upload-for-clinical-notes', label: 'Clinical Notes Upload', icon: '\ud83d\udcc2' },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <button className="sidebar-toggle" onClick={onClose}>
        {isOpen ? '\u2715' : '\u2630'}
      </button>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <span>&#x2695;</span>
          </div>
          <div className="sidebar-brand-text">
            <h2>AI HealthBill</h2>
            <span>Billing Optimizer</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item, i) =>
            item.section ? (
              <div key={i} className="sidebar-section">{item.section}</div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>
      </aside>
    </>
  );
}
