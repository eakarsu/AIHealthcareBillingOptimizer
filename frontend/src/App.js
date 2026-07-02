import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import ChatbotWidget from './components/ChatbotWidget';
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
import AdvancedAIToolsPage from './pages/AdvancedAIToolsPage';
import CustomViewsPage from './pages/CustomViewsPage';
import ChargeCaptureReconciliationPage from './pages/ChargeCaptureReconciliationPage';
import ProductionGapsPage from './pages/ProductionGapsPage';
import ProductionControlsPage from './pages/ProductionControlsPage';
import IntegrationsPage from './pages/IntegrationsPage';
import ChatbotPage from './pages/ChatbotPage';
import './App.css';

// === Batch 04 Gaps & Frontend Mounts ===
import CfAgenticDenialManagementAutonomouslyD from './pages/CfAgenticDenialManagementAutonomouslyD';
import CfRevenueCycleOptimizationModelingClai from './pages/CfRevenueCycleOptimizationModelingClai';
import CfPayerContractIntelligenceIdentifying from './pages/CfPayerContractIntelligenceIdentifying';
import CfPriorAuthAutomationSubmittingFollowi from './pages/CfPriorAuthAutomationSubmittingFollowi';
import CfCodingQualityComplianceAuditorFlaggi from './pages/CfCodingQualityComplianceAuditorFlaggi';
import CfPatientPaymentIntelligencePredicting from './pages/CfPatientPaymentIntelligencePredicting';
import GapNoDenialAnalyzerPredictReversalsRec from './pages/GapNoDenialAnalyzerPredictReversalsRec';
import GapNoCodingRecommenderSuggestIcd10cpt from './pages/GapNoCodingRecommenderSuggestIcd10cpt';
import GapNoContractAnalyzer from './pages/GapNoContractAnalyzer';
import GapNoClaimPrioritizer from './pages/GapNoClaimPrioritizer';
import GapNoComplianceRiskChecker from './pages/GapNoComplianceRiskChecker';
import GapNoPriorAuthApprovalLikelihoodPredic from './pages/GapNoPriorAuthApprovalLikelihoodPredic';
import GapNoEhrIntegrationClinicalDataFor from './pages/GapNoEhrIntegrationClinicalDataFor';
import GapNoPayerApiIntegrationRealTime from './pages/GapNoPayerApiIntegrationRealTime';
import GapNoAppealWorkflowAutomation from './pages/GapNoAppealWorkflowAutomation';
import GapNoProviderCredentialVerification from './pages/GapNoProviderCredentialVerification';
import GapNoNotificationEngine0References from './pages/GapNoNotificationEngine0References';
import GapNoWebhookSurfaceForPayerEvent from './pages/GapNoWebhookSurfaceForPayerEvent';
import GapNoFileUploadForClinicalNotes from './pages/GapNoFileUploadForClinicalNotes';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

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
      <ChatbotWidget />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) {
    return (
      <Routes>
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

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
          <Route path="/charge-capture-reconciliation" element={<ChargeCaptureReconciliationPage />} />
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
          <Route path="/advanced-ai" element={<AdvancedAIToolsPage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/production-gaps" element={<ProductionGapsPage />} />
          <Route path="/production-controls" element={<ProductionControlsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/custom-views" element={<CustomViewsPage />} />
          {/* // === Batch 04 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-denial-management-autonomously-d" element={<CfAgenticDenialManagementAutonomouslyD />} />
          <Route path="/cf-revenue-cycle-optimization-modeling-clai" element={<CfRevenueCycleOptimizationModelingClai />} />
          <Route path="/cf-payer-contract-intelligence-identifying-" element={<CfPayerContractIntelligenceIdentifying />} />
          <Route path="/cf-prior-auth-automation-submitting-followi" element={<CfPriorAuthAutomationSubmittingFollowi />} />
          <Route path="/cf-coding-quality-compliance-auditor-flaggi" element={<CfCodingQualityComplianceAuditorFlaggi />} />
          <Route path="/cf-patient-payment-intelligence-predicting-" element={<CfPatientPaymentIntelligencePredicting />} />
          <Route path="/gap-no-denial-analyzer-predict-reversals-rec" element={<GapNoDenialAnalyzerPredictReversalsRec />} />
          <Route path="/gap-no-coding-recommender-suggest-icd-10cpt" element={<GapNoCodingRecommenderSuggestIcd10cpt />} />
          <Route path="/gap-no-contract-analyzer" element={<GapNoContractAnalyzer />} />
          <Route path="/gap-no-claim-prioritizer" element={<GapNoClaimPrioritizer />} />
          <Route path="/gap-no-compliance-risk-checker" element={<GapNoComplianceRiskChecker />} />
          <Route path="/gap-no-prior-auth-approval-likelihood-predic" element={<GapNoPriorAuthApprovalLikelihoodPredic />} />
          <Route path="/gap-no-ehr-integration-clinical-data-for" element={<GapNoEhrIntegrationClinicalDataFor />} />
          <Route path="/gap-no-payer-api-integration-real-time" element={<GapNoPayerApiIntegrationRealTime />} />
          <Route path="/gap-no-appeal-workflow-automation" element={<GapNoAppealWorkflowAutomation />} />
          <Route path="/gap-no-provider-credential-verification" element={<GapNoProviderCredentialVerification />} />
          <Route path="/gap-no-notification-engine-0-references" element={<GapNoNotificationEngine0References />} />
          <Route path="/gap-no-webhook-surface-for-payer-event" element={<GapNoWebhookSurfaceForPayerEvent />} />
          <Route path="/gap-no-file-upload-for-clinical-notes" element={<GapNoFileUploadForClinicalNotes />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </ProtectedRoute>
  );
}
