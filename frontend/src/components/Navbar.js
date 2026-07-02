import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const pageTitles = {
  '/': 'Dashboard',
  '/claims': 'Claims Management',
  '/denials': 'Denial Management',
  '/patients': 'Patient Billing',
  '/payments': 'Payment Tracking',
  '/providers': 'Provider Management',
  '/insurance': 'Insurance Verification',
  '/prior-auth': 'Prior Authorization',
  '/compliance': 'Compliance Monitoring',
  '/payer-contracts': 'Payer Contracts',
  '/aging-reports': 'Aging Reports',
  '/coding': 'Coding Optimization',
  '/audit-trail': 'Audit Trail',
  '/analytics': 'Analytics',
  '/ai-analysis': 'AI Analysis',
  '/advanced-ai': 'Advanced AI',
  '/chatbot': 'Chatbot',
  '/production-gaps': 'Production Gaps',
  '/production-controls': 'Production Controls',
  '/integrations': 'Integrations',
  '/custom-views': 'Billing Views',
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const title = pageTitles[location.pathname] || 'AI Healthcare Billing';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email
      ? user.email[0].toUpperCase()
      : 'A';

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{title}</h1>
      </div>
      <div className="navbar-right">
        <div className="navbar-user">
          <div className="navbar-avatar">{initials}</div>
          <div className="navbar-user-info">
            <span className="navbar-user-name">{user.name || 'Admin User'}</span>
            <span className="navbar-user-role">{user.role || 'Administrator'}</span>
          </div>
        </div>
        <button className="navbar-logout" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
