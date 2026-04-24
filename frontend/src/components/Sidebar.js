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
