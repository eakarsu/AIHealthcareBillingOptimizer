import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => API.post('/auth/login', { email, password });
export const getProfile = () => API.get('/auth/me');

// Claims
export const getClaims = (params) => API.get('/claims', { params });
export const getClaim = (id) => API.get(`/claims/${id}`);
export const createClaim = (data) => API.post('/claims', data);
export const updateClaim = (id, data) => API.put(`/claims/${id}`, data);
export const deleteClaim = (id) => API.delete(`/claims/${id}`);
export const analyzeClaimDenialRisk = (id) => API.post(`/claims/${id}/analyze`);
export const predictClaimRevenue = (id) => API.post(`/claims/${id}/predict-revenue`);

// Denials
export const getDenials = (params) => API.get('/denials', { params });
export const getDenial = (id) => API.get(`/denials/${id}`);
export const createDenial = (data) => API.post('/denials', data);
export const updateDenial = (id, data) => API.put(`/denials/${id}`, data);
export const deleteDenial = (id) => API.delete(`/denials/${id}`);
export const generateAppeal = (id) => API.post(`/denials/${id}/appeal`);
export const suggestAppeal = (id) => API.post(`/denials/${id}/suggest-appeal`);
export const analyzeDenialPattern = (id) => API.post(`/denials/${id}/analyze-pattern`);
export const analyzeDenialPatterns = () => API.post('/denials/analyze-patterns');

// Patients
export const getPatients = (params) => API.get('/patients', { params });
export const getPatient = (id) => API.get(`/patients/${id}`);
export const createPatient = (data) => API.post('/patients', data);
export const updatePatient = (id, data) => API.put(`/patients/${id}`, data);
export const deletePatient = (id) => API.delete(`/patients/${id}`);

// Payments
export const getPayments = (params) => API.get('/payments', { params });
export const getPayment = (id) => API.get(`/payments/${id}`);
export const createPayment = (data) => API.post('/payments', data);
export const updatePayment = (id, data) => API.put(`/payments/${id}`, data);
export const deletePayment = (id) => API.delete(`/payments/${id}`);

// Providers
export const getProviders = (params) => API.get('/providers', { params });
export const getProvider = (id) => API.get(`/providers/${id}`);
export const createProvider = (data) => API.post('/providers', data);
export const updateProvider = (id, data) => API.put(`/providers/${id}`, data);
export const deleteProvider = (id) => API.delete(`/providers/${id}`);

// Insurance Verifications
export const getInsuranceVerifications = (params) => API.get('/insurance-verifications', { params });
export const getInsuranceVerification = (id) => API.get(`/insurance-verifications/${id}`);
export const createInsuranceVerification = (data) => API.post('/insurance-verifications', data);
export const updateInsuranceVerification = (id, data) => API.put(`/insurance-verifications/${id}`, data);
export const deleteInsuranceVerification = (id) => API.delete(`/insurance-verifications/${id}`);
export const verifyInsurance = (id) => API.post(`/insurance-verifications/${id}/verify`);

// Prior Authorizations
export const getPriorAuths = (params) => API.get('/prior-authorizations', { params });
export const getPriorAuth = (id) => API.get(`/prior-authorizations/${id}`);
export const createPriorAuth = (data) => API.post('/prior-authorizations', data);
export const updatePriorAuth = (id, data) => API.put(`/prior-authorizations/${id}`, data);
export const deletePriorAuth = (id) => API.delete(`/prior-authorizations/${id}`);
export const analyzePriorAuth = (id) => API.post(`/prior-authorizations/${id}/analyze`);

// Compliance
export const getComplianceRules = (params) => API.get('/compliance', { params });
export const getComplianceRule = (id) => API.get(`/compliance/${id}`);
export const createComplianceRule = (data) => API.post('/compliance', data);
export const updateComplianceRule = (id, data) => API.put(`/compliance/${id}`, data);
export const deleteComplianceRule = (id) => API.delete(`/compliance/${id}`);
export const checkCompliance = (id) => API.post(`/compliance/${id}/check`);

// Payer Contracts
export const getPayerContracts = (params) => API.get('/payer-contracts', { params });
export const getPayerContract = (id) => API.get(`/payer-contracts/${id}`);
export const createPayerContract = (data) => API.post('/payer-contracts', data);
export const updatePayerContract = (id, data) => API.put(`/payer-contracts/${id}`, data);
export const deletePayerContract = (id) => API.delete(`/payer-contracts/${id}`);
export const analyzeContract = (id) => API.post(`/payer-contracts/${id}/analyze`);

// Aging Reports
export const getAgingReports = (params) => API.get('/aging-reports', { params });
export const getAgingReport = (id) => API.get(`/aging-reports/${id}`);
export const createAgingReport = (data) => API.post('/aging-reports', data);
export const updateAgingReport = (id, data) => API.put(`/aging-reports/${id}`, data);
export const deleteAgingReport = (id) => API.delete(`/aging-reports/${id}`);
export const predictCollections = () => API.post('/aging-reports/predict');
export const predictCollectionById = (id) => API.post(`/aging-reports/${id}/predict`);

// Coding Optimizations
export const getCodingOptimizations = (params) => API.get('/coding-optimizations', { params });
export const getCodingOptimization = (id) => API.get(`/coding-optimizations/${id}`);
export const createCodingOptimization = (data) => API.post('/coding-optimizations', data);
export const updateCodingOptimization = (id, data) => API.put(`/coding-optimizations/${id}`, data);
export const deleteCodingOptimization = (id) => API.delete(`/coding-optimizations/${id}`);
export const optimizeCoding = (id) => API.post(`/coding-optimizations/${id}/optimize`);

// Audit Trail
export const getAuditTrail = (params) => API.get('/audit-trail', { params });
export const getAuditEntry = (id) => API.get(`/audit-trail/${id}`);
export const updateAuditEntry = (id, data) => API.put(`/audit-trail/${id}`, data);
export const deleteAuditEntry = (id) => API.delete(`/audit-trail/${id}`);

// Analytics
export const getDashboardAnalytics = () => API.get('/analytics/dashboard');
export const getRevenueAnalytics = () => API.get('/analytics/revenue');
export const predictRevenue = () => API.post('/analytics/ai-predict');

// AI Analysis
export const getAIAnalyses = (params) => API.get('/ai-analysis', { params });
export const getAIAnalysis = (id) => API.get(`/ai-analysis/${id}`);

// Feature gaps
export const getFeatureGaps = () => API.get('/feature-gaps');
export const analyzeFeatureGap = (slug, context) => API.post(`/feature-gaps/${slug}/analyze`, { context });

// Integrations
export const getIntegrations = () => API.get('/integrations');
export const getIntegration = (slug) => API.get(`/integrations/${slug}`);
export const getIntegrationReadiness = (slug) => API.get(`/integrations/${slug}/readiness`);
export const generateIntegrationPlan = (slug, context) => API.post(`/integrations/${slug}/plan`, { context });

// Chatbot
export const getChatbotHistory = () => API.get('/chatbot/history');
export const sendChatbotMessage = (message) => API.post('/chatbot/message', { message });

// Dashboard helpers (use analytics endpoints)
export const getDashboardMetrics = () => API.get('/analytics/dashboard');

export default API;
