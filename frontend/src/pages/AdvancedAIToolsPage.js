import React, { useEffect, useMemo, useState } from 'react';
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

const sampleCompliance = '{\n  "type": "claim",\n  "id": 1,\n  "status": "submitted",\n  "documentation": "clinical note attached"\n}';
const sampleAging = '[\n  {"account": "A1", "days_past_due": 60, "balance": 1200}\n]';
const samplePriorAuth = '{\n  "payer": "Aetna",\n  "service": "MRI brain",\n  "supporting_codes": ["G89.0"],\n  "clinical_notes": "Persistent migraine"\n}';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? `$${number.toLocaleString()}` : '$0';
}

function claimLabel(claim) {
  return `#${claim.id} ${claim.patient_name || 'Unknown patient'} - ${claim.cpt_code || 'No CPT'} - ${money(claim.billed_amount)}`;
}

function denialLabel(denial) {
  const reason = denial.denial_code || denial.denial_reason || 'No reason';
  return `#${denial.id} Claim ${denial.claim_id || 'n/a'} - ${reason}`;
}

function contractLabel(contract) {
  return `#${contract.id} ${contract.payer_name || 'Unknown payer'} - ${contract.contract_number || contract.status || 'contract'}`;
}

function agingLabel(item) {
  return `#${item.id} Claim ${item.claim_id || 'n/a'} - ${item.aging_bucket || item.days_outstanding || 'aging'} - ${money(item.amount)}`;
}

function priorAuthLabel(item) {
  return `#${item.id} ${item.service_description || item.cpt_code || 'Prior auth'} - ${item.status || 'pending'}`;
}

function complianceLabel(item) {
  return `#${item.id} ${item.rule_name || item.category || 'Compliance record'} - ${item.status || 'review'}`;
}

export default function AdvancedAIToolsPage() {
  const [tab, setTab] = useState('denial');
  const [loading, setLoading] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [lookups, setLookups] = useState({
    claims: [],
    denials: [],
    contracts: [],
    compliance: [],
    aging: [],
    priorAuths: [],
  });

  const [denialForm, setDenialForm] = useState({ denial_ids: '' });
  const [codingForm, setCodingForm] = useState({ claim_id: '' });
  const [contractForm, setContractForm] = useState({ contract_id: '' });
  const [complianceForm, setComplianceForm] = useState({ compliance_id: '', record_json: sampleCompliance, entity_type: 'claim' });
  const [appealForm, setAppealForm] = useState({ denial_id: '' });
  const [agingForm, setAgingForm] = useState({ aging_id: '', aging_json: sampleAging });
  const [prioritizeForm, setPrioritizeForm] = useState({ claim_ids: '', status: 'pending', limit: '50' });
  const [priorAuthForm, setPriorAuthForm] = useState({ prior_auth_id: '', request_json: samplePriorAuth });
  const [revenueForm, setRevenueForm] = useState({ lookback_days: '90' });

  useEffect(() => {
    let mounted = true;
    async function loadLookups() {
      setLookupsLoading(true);
      const get = (path) => axios.get(`${API_BASE}${path}`, { headers: authHeaders() }).then(res => normalizeList(res.data)).catch(() => []);
      const [claims, denials, contracts, compliance, aging, priorAuths] = await Promise.all([
        get('/claims?limit=100'),
        get('/denials?limit=100'),
        get('/payer-contracts?limit=100'),
        get('/compliance?limit=100'),
        get('/aging-reports?limit=100'),
        get('/prior-authorizations?limit=100'),
      ]);

      if (!mounted) return;
      setLookups({ claims, denials, contracts, compliance, aging, priorAuths });
      setLookupsLoading(false);
    }
    loadLookups();
    return () => { mounted = false; };
  }, []);

  const selectedAging = useMemo(
    () => lookups.aging.find(item => String(item.id) === String(agingForm.aging_id)),
    [agingForm.aging_id, lookups.aging]
  );
  const selectedCompliance = useMemo(
    () => lookups.compliance.find(item => String(item.id) === String(complianceForm.compliance_id)),
    [complianceForm.compliance_id, lookups.compliance]
  );

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
      setError(status === 503 ? `AI service unavailable (503): ${msg}` : msg);
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
    post('/ai-analysis/coding-recommender', { claim_id: codingForm.claim_id || undefined });
  };

  const onContract = (e) => {
    e.preventDefault();
    post('/ai-analysis/contract-analyzer', { contract_id: contractForm.contract_id || undefined });
  };

  const onCompliance = (e) => {
    e.preventDefault();
    let record = selectedCompliance;
    if (!record) {
      try { record = JSON.parse(complianceForm.record_json); }
      catch (_) { setError('record JSON is invalid'); return; }
    }
    post('/ai-analysis/compliance-checker', { record, entity_type: complianceForm.entity_type });
  };

  const onAppeal = (e) => {
    e.preventDefault();
    post('/ai-analysis/appeal-generator', { denial_id: appealForm.denial_id || undefined });
  };

  const onAging = (e) => {
    e.preventDefault();
    if (selectedAging) {
      post('/ai-analysis/aging-predictor', { aging: [selectedAging] });
      return;
    }
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
    if (priorAuthForm.prior_auth_id) {
      post('/ai-analysis/prior-auth-prediction', { prior_auth_id: priorAuthForm.prior_auth_id });
      return;
    }
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

  const selectStyle = { ...inputStyle, background: 'white' };
  const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#5f6368', marginBottom: 6 };
  const helpText = { color: '#5f6368', fontSize: '0.75rem', marginTop: 6 };

  return (
    <div className="feature-page" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#202124' }}>Advanced AI Tools</h2>
        <p style={{ fontSize: '0.8125rem', color: '#5f6368', marginTop: 2 }}>
          Run AI analysis from available records. Empty selections use latest data or the sample payload shown.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} style={tabBtnStyle(tab === t.id)} onClick={() => { setTab(t.id); setResult(null); setError(null); }}>
            {t.label}
          </button>
        ))}
      </div>

      {lookupsLoading && (
        <div style={{ background: '#e8f0fe', color: '#1557b0', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: '0.875rem' }}>
          Loading available records for dropdowns...
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        {tab === 'denial' && (
          <form onSubmit={onDenial}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Denial record</label>
              {lookups.denials.length > 0 ? (
                <select style={selectStyle} value={denialForm.denial_ids} onChange={e => setDenialForm({ denial_ids: e.target.value })}>
                  <option value="">Use latest denials</option>
                  {lookups.denials.map(denial => <option key={denial.id} value={denial.id}>{denialLabel(denial)}</option>)}
                </select>
              ) : (
                <input style={inputStyle} value={denialForm.denial_ids} onChange={e => setDenialForm({ denial_ids: e.target.value })} placeholder="Optional: 12, 14, 27" />
              )}
              <div style={helpText}>Leave empty to analyze the latest denial records.</div>
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Analyzing...' : 'Analyze Denials'}
            </button>
          </form>
        )}

        {tab === 'coding' && (
          <form onSubmit={onCoding}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Claim record</label>
              {lookups.claims.length > 0 ? (
                <select style={selectStyle} value={codingForm.claim_id} onChange={e => setCodingForm({ claim_id: e.target.value })}>
                  <option value="">Use latest claim</option>
                  {lookups.claims.map(claim => <option key={claim.id} value={claim.id}>{claimLabel(claim)}</option>)}
                </select>
              ) : (
                <input style={inputStyle} value={codingForm.claim_id} onChange={e => setCodingForm({ claim_id: e.target.value })} placeholder="Optional claim ID" />
              )}
              <div style={helpText}>No ID is required. Empty selection uses the latest claim or backend sample data.</div>
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Generating...' : 'Recommend Coding'}
            </button>
          </form>
        )}

        {tab === 'contract' && (
          <form onSubmit={onContract}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Payer contract</label>
              {lookups.contracts.length > 0 ? (
                <select style={selectStyle} value={contractForm.contract_id} onChange={e => setContractForm({ contract_id: e.target.value })}>
                  <option value="">Use latest contract</option>
                  {lookups.contracts.map(contract => <option key={contract.id} value={contract.id}>{contractLabel(contract)}</option>)}
                </select>
              ) : (
                <input style={inputStyle} value={contractForm.contract_id} onChange={e => setContractForm({ contract_id: e.target.value })} placeholder="Optional contract ID" />
              )}
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Analyzing...' : 'Analyze Contract'}
            </button>
          </form>
        )}

        {tab === 'compliance' && (
          <form onSubmit={onCompliance}>
            {lookups.compliance.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Compliance record</label>
                <select style={selectStyle} value={complianceForm.compliance_id} onChange={e => setComplianceForm({ ...complianceForm, compliance_id: e.target.value })}>
                  <option value="">Use sample/manual JSON</option>
                  {lookups.compliance.map(record => <option key={record.id} value={record.id}>{complianceLabel(record)}</option>)}
                </select>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Entity Type</label>
              <input style={inputStyle} value={complianceForm.entity_type} onChange={e => setComplianceForm({ ...complianceForm, entity_type: e.target.value })} placeholder="claim, payment, contract, ..." />
            </div>
            {!selectedCompliance && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Record JSON</label>
                <textarea style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 120 }} value={complianceForm.record_json} onChange={e => setComplianceForm({ ...complianceForm, record_json: e.target.value })} />
              </div>
            )}
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verifying...' : 'Verify Compliance'}
            </button>
          </form>
        )}

        {tab === 'appeal' && (
          <form onSubmit={onAppeal}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Denial record</label>
              {lookups.denials.length > 0 ? (
                <select style={selectStyle} value={appealForm.denial_id} onChange={e => setAppealForm({ denial_id: e.target.value })}>
                  <option value="">Use latest denial</option>
                  {lookups.denials.map(denial => <option key={denial.id} value={denial.id}>{denialLabel(denial)}</option>)}
                </select>
              ) : (
                <input style={inputStyle} value={appealForm.denial_id} onChange={e => setAppealForm({ denial_id: e.target.value })} placeholder="Optional denial ID" />
              )}
            </div>
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Generating...' : 'Generate Appeal'}
            </button>
          </form>
        )}

        {tab === 'aging' && (
          <form onSubmit={onAging}>
            {lookups.aging.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Aging account</label>
                <select style={selectStyle} value={agingForm.aging_id} onChange={e => setAgingForm({ ...agingForm, aging_id: e.target.value })}>
                  <option value="">Use sample/manual JSON</option>
                  {lookups.aging.map(item => <option key={item.id} value={item.id}>{agingLabel(item)}</option>)}
                </select>
              </div>
            )}
            {!selectedAging && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Aging Accounts JSON</label>
                <textarea style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 120 }} value={agingForm.aging_json} onChange={e => setAgingForm({ ...agingForm, aging_json: e.target.value })} />
              </div>
            )}
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Predicting...' : 'Predict Collections'}
            </button>
          </form>
        )}

        {tab === 'prioritize' && (
          <form onSubmit={onPrioritize}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Claim record</label>
              {lookups.claims.length > 0 ? (
                <select style={selectStyle} value={prioritizeForm.claim_ids} onChange={e => setPrioritizeForm({ ...prioritizeForm, claim_ids: e.target.value })}>
                  <option value="">Use latest by status</option>
                  {lookups.claims.map(claim => <option key={claim.id} value={claim.id}>{claimLabel(claim)}</option>)}
                </select>
              ) : (
                <input style={inputStyle} value={prioritizeForm.claim_ids} onChange={e => setPrioritizeForm({ ...prioritizeForm, claim_ids: e.target.value })} placeholder="Optional claim IDs" />
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Status filter</label>
                <select style={selectStyle} value={prioritizeForm.status} onChange={e => setPrioritizeForm({ ...prioritizeForm, status: e.target.value })}>
                  <option value="">Any status</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                </select>
              </div>
              <div style={{ width: 140 }}>
                <label style={labelStyle}>Limit</label>
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
            {lookups.priorAuths.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Prior authorization</label>
                <select style={selectStyle} value={priorAuthForm.prior_auth_id} onChange={e => setPriorAuthForm({ ...priorAuthForm, prior_auth_id: e.target.value })}>
                  <option value="">Use sample/manual JSON</option>
                  {lookups.priorAuths.map(item => <option key={item.id} value={item.id}>{priorAuthLabel(item)}</option>)}
                </select>
              </div>
            )}
            {!priorAuthForm.prior_auth_id && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Prior Auth Request JSON</label>
                <textarea style={{ ...inputStyle, fontFamily: 'monospace', minHeight: 140 }} value={priorAuthForm.request_json} onChange={e => setPriorAuthForm({ ...priorAuthForm, request_json: e.target.value })} />
              </div>
            )}
            <button type="submit" disabled={loading} style={{ ...tabBtnStyle(true), opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Predicting...' : 'Predict Prior Auth'}
            </button>
          </form>
        )}

        {tab === 'revenue' && (
          <form onSubmit={onRevenue}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Lookback days</label>
              <select style={selectStyle} value={revenueForm.lookback_days} onChange={e => setRevenueForm({ lookback_days: e.target.value })}>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
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
        </div>
      )}
    </div>
  );
}
