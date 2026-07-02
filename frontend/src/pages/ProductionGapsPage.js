import React, { useEffect, useMemo, useState } from 'react';
import AIResultDisplay from '../components/AIResultDisplay';
import { analyzeFeatureGap, getFeatureGaps } from '../services/api';
import './ProductionWorkspace.css';

export default function ProductionGapsPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [context, setContext] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [domainFilter, setDomainFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');

  useEffect(() => {
    let mounted = true;
    getFeatureGaps()
      .then((res) => {
        if (!mounted) return;
        const data = res.data?.data || [];
        setRows(data);
        setSelected(data[0] || null);
      })
      .catch((err) => setError(err.response?.data?.error || err.message || 'Failed to load feature gaps'));
    return () => { mounted = false; };
  }, []);

  const counts = useMemo(() => {
    const critical = rows.filter(row => row.severity === 'Critical').length;
    const integration = rows.filter(row => row.domain === 'Integrations' || row.capability?.toLowerCase().includes('connector')).length;
    return { critical, integration };
  }, [rows]);

  const domains = useMemo(() => ['All', ...Array.from(new Set(rows.map(row => row.domain))).sort()], [rows]);
  const severities = useMemo(() => ['All', 'Critical', 'High', 'Medium'], []);
  const filteredRows = useMemo(() => rows.filter((row) => {
    const domainMatch = domainFilter === 'All' || row.domain === domainFilter;
    const severityMatch = severityFilter === 'All' || row.severity === severityFilter;
    return domainMatch && severityMatch;
  }), [domainFilter, rows, severityFilter]);

  const selectRow = (row) => {
    setSelected(row);
    setResult(null);
    setError('');
  };

  const runGapAnalysis = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await analyzeFeatureGap(selected.slug, context);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Feature gap analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-page">
      <div className="page-header">
        <div>
          <h1>Production Feature Gaps</h1>
          <p>Missing revenue-cycle capabilities that must become real workflows before this can be treated as a complete healthcare billing product.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="metric-card"><span>Open Gaps</span><strong>{rows.length}</strong><small>Features requiring implementation</small></div>
        <div className="metric-card"><span>Critical Gaps</span><strong>{counts.critical}</strong><small>Must be resolved before production use</small></div>
        <div className="metric-card"><span>Connector Gaps</span><strong>{counts.integration}</strong><small>EDI, payer, EHR, portal, and delivery integrations</small></div>
        <div className="metric-card"><span>Visible Gaps</span><strong>{filteredRows.length}</strong><small>Filtered by domain and severity</small></div>
      </div>

      {selected && (
        <div className="content-card selected-summary">
          <div>
            <h2>{selected.name}</h2>
            <p>{selected.capability}</p>
            <div className="summary-meta">
              <span className="badge badge-blue">Domain: {selected.domain}</span>
              <span className="badge badge-yellow">Severity: {selected.severity}</span>
              <span className="badge badge-red">{selected.status}</span>
            </div>
          </div>
          <button className="workspace-action-btn" type="button" onClick={runGapAnalysis} disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze Gap with AI'}
          </button>
          <textarea
            className="workspace-context-input"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Optional context: payer, specialty, system constraints, or rollout notes"
          />
        </div>
      )}

      {error && <div className="workspace-error">{error}</div>}
      {(loading || result) && (
        <div className="content-card">
          <AIResultDisplay result={result} loading={loading} />
        </div>
      )}

      <div className="content-card table-shell">
        <div className="workspace-filters">
          <div>
            <label>Domain</label>
            <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)}>
              {domains.map(domain => <option key={domain} value={domain}>{domain}</option>)}
            </select>
          </div>
          <div>
            <label>Severity</label>
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
              {severities.map(severity => <option key={severity} value={severity}>{severity}</option>)}
            </select>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Domain</th>
              <th>Production Capability</th>
              <th>Severity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.slug} onClick={() => selectRow(row)} className={selected?.slug === row.slug ? 'is-selected' : ''} style={{ cursor: 'pointer' }}>
                <td><strong>{row.name}</strong></td>
                <td>{row.domain}</td>
                <td>{row.capability}</td>
                <td>{row.severity}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
