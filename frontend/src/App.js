import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import ClaimsPage from './pages/ClaimsPage';
import DenialsPage from './pages/DenialsPage';
import PatientsPage from './pages/PatientsPage';
import PaymentsPage from './pages/PaymentsPage';
import ProvidersPage from './pages/ProvidersPage';
import InsurancePage from './pages/InsurancePage';
import PriorAuthPage from './pages/PriorAuthPage';
import CompliancePage from './pages/CompliancePage';
import PayerContractsPage from './pages/PayerContractsPage';
import AgingReportsPage from './pages/AgingReportsPage';
import CodingPage from './pages/CodingPage';
import AuditTrailPage from './pages/AuditTrailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AIAnalysisPage from './pages/AIAnalysisPage';
import './App.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(prev => !prev)} />
      <div className="app-main">
        <Navbar />
        <div className="app-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/claims" element={<ClaimsPage />} />
          <Route path="/denials" element={<DenialsPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/insurance" element={<InsurancePage />} />
          <Route path="/prior-auth" element={<PriorAuthPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/payer-contracts" element={<PayerContractsPage />} />
          <Route path="/aging-reports" element={<AgingReportsPage />} />
          <Route path="/coding" element={<CodingPage />} />
          <Route path="/audit-trail" element={<AuditTrailPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/ai-analysis" element={<AIAnalysisPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </ProtectedRoute>
  );
}
