import React, { useState } from 'react';
import axios from 'axios';
import AIResultDisplay from '../components/AIResultDisplay';
import '../components/FeaturePage.css';

const API_BASE = 'http://localhost:4000/api';

const TABS = [
  { id: 'denial', label: 'Denial Analyzer' },
  { id: 'coding', label: 'Coding Recommender' },
  { id: 'contract', label: 'Contract Analyzer' },
  { id: 'compliance', label: 'Compliance Checker' },
  { id: 'appeal', label: 'Appeal Generator' },
  { id: 'aging', label: 'Aging Predictor' },
  { id: 'prioritize', label: 'Claim Prioritizer' },
  { id: 'priorauth', label: 'Prior Auth Prediction' },
  { id: 'revenue', label: 'Revenue Forecaster' },
];

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdvancedAIToolsPage() {
  const [tab, setTab] = useState('denial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [denialForm, setDenialForm] = useState({ denial_ids: '' });
  const [codingForm, setCodingForm] = useState({ claim_id: '' });
  const [contractForm, setContractForm] = useState({ contract_id: '' });
  const [complianceForm, setComplianceForm] = useState({ record_json: '{\n  "type": "claim",\n  "id": 1\n}', entity_type: 'claim' });
  const [appealForm, setAppealForm] = useState({ denial_id: '' });
  const [agingForm, setAgingForm] = useState({ aging_json: '[\n  {"account": "A1", "days_past_due": 60, "balance": 1200}\n]' });
  const [prioritizeForm, setPrioritizeForm] = useState({ claim_ids: '', status: 'pending', limit: '50' });
  const [priorAuthForm, setPriorAuthForm] = useState({ request_json: '{\n  "payer": "Aetna",\n  "service": "MRI brain",\n  "supporting_codes": ["G89.0"],\n  "clinical_notes": "Persistent migraine"\n}' });
  const [revenueForm, setRevenueForm] = useState({ lookback_days: '90' });

  const post = async (path, body) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post(`${API_BASE}${path}`, body, { headers: { ...authHeaders(), 'Content-Type': 'application/json' } });
      setResult(res.data);
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.error || e.response?.data?.message || e.message || 'Request failed';
      if (status === 503) {
        setError(`AI service unavailable (503): ${msg}`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const onDenial = (e) => {
    e.preventDefault();
    const ids = denialForm.denial_ids.split(',').map(s => s.trim()).filter(Boolean);
    post('/ai-analysis/denial-analyzer', { denial_ids: ids.length ? ids : undefined });
  };
  const onCoding = (e) => {
    e.preventDefault();
    if (!codingForm.claim_id) { setError('claim_id is required'); return; }
    post('/ai-analysis/coding-recommender', { claim_id: codingForm.claim_id });
  };
  const onContract = (e) => {
    e.preventDefault();
    if (!contractForm.contract_id) { setError('contract_id is required'); return; }
    post('/ai-analysis/contract-analyzer', { contract_id: contractForm.contract_id });
  };
  const onCompliance = (e) => {
    e.preventDefault();
    let record;
    try { record = JSON.parse(complianceForm.record_json); }
    catch (_) { setError('record JSON is invalid'); return; }
    post('/ai-analysis/compliance-checker', { record, entity_type: complianceForm.entity_type });
  };
  const onAppeal = (e) => {
    e.preventDefault();
    if (!appealForm.denial_id) { setError('denial_id is required'); return; }
    post('/ai-analysis/appeal-generator', { denial_id: appealForm.denial_id });
  };
  const onAging = (e) => {
    e.preventDefault();
    let aging;
    try { aging = JSON.parse(agingForm.aging_json); }
    catch (_) { setError('aging JSON must be a JSON array'); return; }
    if (!Array.isArray(aging)) { setError('aging JSON must be a JSON array'); return; }
    post('/ai-analysis/aging-predictor', { aging });
  };
  const onPrioritize = (e) => {
    e.preventDefault();
    const ids = prioritizeForm.claim_ids.split(',').map(s => s.trim()).filter(Boolean);
    post('/ai-analysis/claim-prioritizer', {
      claim_ids: ids.length ? ids : undefined,
      status: prioritizeForm.status || undefined,
      limit: prioritizeForm.limit ? Number(prioritizeForm.limit) : undefined,
    });
  };
  const onPriorAuth = (e) => {
    e.preventDefault();
    let request;
    try { request = JSON.parse(priorAuthForm.request_json); }
    catch (_) { setError('request JSON is invalid'); return; }
    post('/ai-analysis/prior-auth-prediction', { request });
  };
  const onRevenue = (e) => {
    e.preventDefault();
    post('/ai-analysis/revenue-forecaster', {
      lookback_days: revenueForm.lookback_days ? Number(revenueForm.lookback_days) : undefined,
    });
  };

  const tabBtnStyle = (active) => ({
    padding: '8px 16px',
    border: 'none',
    background: active ? '#1a73e8' : '#f1f3f4',
    color: active ? 'white' : '#202124',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  });

  const inputStyle = {
    width: '100%',
    padding: 10,
    border: '1px solid #dadce0',
    borderRadius: 6,
    fontSize: '0.875rem',
  };

  return (
    <div className="feature-page" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#202124' }}>Advanced AI Tools</h2>
        <p style={{ fontSize: '0.8125rem', color: '#5f6368', marginTop: 2 }}>
          Denial analysis, coding recommendations, and payer contract analysis.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} style={tabBtnStyle(tab === t.id)} onClick={() => { setTab(t.id); setResult(null); setError(null); }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        {tab === 'denial' && (
          <form onSubmit={onDenial}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>
                Denial IDs (comma-separated, optional - latest 100 used if empty)
              </label>
              <input
                style={inputStyle}
                value={denialForm.denial_ids}
                onChange={e => setDenialForm({ denial_ids: e.target.value })}
                placeholder="e.g. 12, 14, 27"
              />
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Analyzing...' : 'Analyze Denials'}
            </button>
          </form>
        )}

        {tab === 'coding' && (
          <form onSubmit={onCoding}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Claim ID *</label>
              <input
                style={inputStyle}
                value={codingForm.claim_id}
                onChange={e => setCodingForm({ claim_id: e.target.value })}
                placeholder="e.g. 1234"
              />
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Generating...' : 'Recommend Coding'}
            </button>
          </form>
        )}

        {tab === 'contract' && (
          <form onSubmit={onContract}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Contract ID *</label>
              <input
                style={inputStyle}
                value={contractForm.contract_id}
                onChange={e => setContractForm({ contract_id: e.target.value })}
                placeholder="e.g. 42"
              />
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Analyzing...' : 'Analyze Contract'}
            </button>
          </form>
        )}

        {tab === 'compliance' && (
          <form onSubmit={onCompliance}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Entity Type</label>
              <input style={inputStyle} value={complianceForm.entity_type} onChange={e => setComplianceForm({ ...complianceForm, entity_type: e.target.value })} placeholder="claim, payment, contract, ..." />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Record JSON *</label>
              <textarea style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 120 }} value={complianceForm.record_json} onChange={e => setComplianceForm({ ...complianceForm, record_json: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verifying...' : 'Verify Compliance'}
            </button>
          </form>
        )}

        {tab === 'appeal' && (
          <form onSubmit={onAppeal}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Denial ID *</label>
              <input style={inputStyle} value={appealForm.denial_id} onChange={e => setAppealForm({ denial_id: e.target.value })} placeholder="e.g. 42" />
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Generating...' : 'Generate Appeal'}
            </button>
          </form>
        )}

        {tab === 'aging' && (
          <form onSubmit={onAging}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Aging Accounts JSON (array) *</label>
              <textarea style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 120 }} value={agingForm.aging_json} onChange={e => setAgingForm({ aging_json: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Predicting...' : 'Predict Collections'}
            </button>
          </form>
        )}

        {tab === 'prioritize' && (
          <form onSubmit={onPrioritize}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Claim IDs (comma-separated, optional)</label>
              <input style={inputStyle} value={prioritizeForm.claim_ids} onChange={e => setPrioritizeForm({ ...prioritizeForm, claim_ids: e.target.value })} placeholder="leave empty to use latest pending" />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Status filter</label>
                <input style={inputStyle} value={prioritizeForm.status} onChange={e => setPrioritizeForm({ ...prioritizeForm, status: e.target.value })} />
              </div>
              <div style={{ width: 140 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Limit</label>
                <input type="number" style={inputStyle} value={prioritizeForm.limit} onChange={e => setPrioritizeForm({ ...prioritizeForm, limit: e.target.value })} />
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Ranking...' : 'Prioritize Claims'}
            </button>
          </form>
        )}

        {tab === 'priorauth' && (
          <form onSubmit={onPriorAuth}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Prior auth request JSON *</label>
              <textarea style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 140 }} value={priorAuthForm.request_json} onChange={e => setPriorAuthForm({ request_json: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Predicting...' : 'Predict Prior Auth'}
            </button>
          </form>
        )}

        {tab === 'revenue' && (
          <form onSubmit={onRevenue}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 }}>Lookback days</label>
              <input type="number" style={inputStyle} value={revenueForm.lookback_days} onChange={e => setRevenueForm({ lookback_days: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Forecasting...' : 'Forecast Revenue'}
            </button>
          </form>
        )}
      </div>

      {error && (
        <div style={{ background: '#fce8e6', color: '#c5221f', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Result</h3>
          <AIResultDisplay result={result.result || result.analysis || result} />
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.8125rem', color: '#5f6368' }}>Raw Response</summary>
            <pre style={{ marginTop: 8, padding: 12, background: '#f8f9fa', borderRadius: 6, fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
