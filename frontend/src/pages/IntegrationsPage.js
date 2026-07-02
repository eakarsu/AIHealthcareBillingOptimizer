import React, { useEffect, useMemo, useState } from 'react';
import AIResultDisplay from '../components/AIResultDisplay';
import { generateIntegrationPlan, getIntegrationReadiness, getIntegrations } from '../services/api';
import './ProductionWorkspace.css';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [context, setContext] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [result, setResult] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getIntegrations()
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data || [];
        setIntegrations(data);
        setSelected(data[0] || null);
      })
      .catch((err) => setError(err.response?.data?.error || err.message || 'Failed to load integrations'));
    return () => { mounted = false; };
  }, []);

  const categories = useMemo(() => ['All', ...Array.from(new Set(integrations.map(item => item.category))).sort()], [integrations]);
  const filteredIntegrations = useMemo(() => integrations.filter((item) => (
    categoryFilter === 'All' || item.category === categoryFilter
  )), [categoryFilter, integrations]);
  const criticalCount = useMemo(() => integrations.filter(item => item.priority === 'Critical').length, [integrations]);

  const selectIntegration = (integration) => {
    setSelected(integration);
    setReadiness(null);
    setResult(null);
    setError('');
  };

  const checkReadiness = async () => {
    if (!selected) return;
    setLoadingReadiness(true);
    setError('');
    try {
      const res = await getIntegrationReadiness(selected.slug);
      setReadiness(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load readiness');
    } finally {
      setLoadingReadiness(false);
    }
  };

  const runPlan = async () => {
    if (!selected) return;
    setLoadingPlan(true);
    setError('');
    setResult(null);
    try {
      const res = await generateIntegrationPlan(selected.slug, context);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate integration plan');
    } finally {
      setLoadingPlan(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="page-header">
        <div>
          <h1>Integration Readiness</h1>
          <p>Connector preparation for clearinghouse, payer, EHR, document, payment, notification, identity, webhook, AI, and observability systems.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="metric-card"><span>Prepared Connectors</span><strong>{integrations.length}</strong><small>Catalogued integration surfaces</small></div>
        <div className="metric-card"><span>Critical Connectors</span><strong>{criticalCount}</strong><small>Needed before production launch</small></div>
        <div className="metric-card"><span>Visible Connectors</span><strong>{filteredIntegrations.length}</strong><small>Filtered by category</small></div>
      </div>

      {selected && (
        <div className="content-card selected-summary">
          <div>
            <h2>{selected.name}</h2>
            <p>{selected.purpose}</p>
            <div className="summary-meta">
              <span className="badge badge-blue">{selected.category}</span>
              <span className="badge badge-yellow">Priority: {selected.priority}</span>
              <span className="badge badge-green">{selected.status}</span>
            </div>
          </div>
          <div className="workspace-action-group">
            <button className="workspace-action-btn" type="button" onClick={checkReadiness} disabled={loadingReadiness}>
              {loadingReadiness ? 'Loading...' : 'Readiness'}
            </button>
            <button className="workspace-action-btn" type="button" onClick={runPlan} disabled={loadingPlan}>
              {loadingPlan ? 'Planning...' : 'AI Plan'}
            </button>
          </div>
          <textarea
            className="workspace-context-input"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Optional context: target vendor, sandbox constraints, rollout phase, specialty, or payer mix"
          />
        </div>
      )}

      {error && <div className="workspace-error">{error}</div>}

      {readiness && (
        <div className="content-card workspace-detail-grid">
          <div>
            <h3>Required Environment Names</h3>
            <div className="workspace-pill-list">
              {readiness.requiredEnv.map(item => <span key={item.name} className="badge badge-gray">{item.name}</span>)}
            </div>
          </div>
          <div>
            <h3>Workflow Coverage</h3>
            <ul className="workspace-compact-list">
              {readiness.workflows.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3>Sandbox Tests</h3>
            <ul className="workspace-compact-list">
              {readiness.testScenarios.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div>
            <h3>Status</h3>
            <p>{readiness.message}</p>
          </div>
        </div>
      )}

      {(loadingPlan || result) && (
        <div className="content-card">
          <AIResultDisplay result={result} loading={loadingPlan} />
        </div>
      )}

      <div className="content-card table-shell">
        <div className="workspace-filters">
          <div>
            <label>Category</label>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Integration</th>
              <th>Category</th>
              <th>Purpose</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredIntegrations.map((integration) => (
              <tr key={integration.slug} onClick={() => selectIntegration(integration)} className={selected?.slug === integration.slug ? 'is-selected' : ''} style={{ cursor: 'pointer' }}>
                <td><strong>{integration.name}</strong></td>
                <td>{integration.category}</td>
                <td>{integration.purpose}</td>
                <td>{integration.priority}</td>
                <td>{integration.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
