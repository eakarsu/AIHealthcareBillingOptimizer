import React, { useEffect, useState } from 'react';
import API from '../services/api';

export default function DenialReasonChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    API.get('/custom-views/denial-reasons')
      .then((r) => { if (mounted) { setData(r.data); setError(''); } })
      .catch((e) => { if (mounted) setError(e.message || 'Failed to load'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading denial reasons...</div>;
  if (error) return <div style={{ padding: 16, color: '#c00' }}>Error: {error}</div>;
  const reasons = data?.reasons || [];
  const max = Math.max(1, ...reasons.map((r) => r.claim_count));

  return (
    <div data-testid="denial-reason-chart" style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ margin: '0 0 4px', color: '#0f172a' }}>Claim Denial Reasons</h3>
      <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>
        Total denials: <strong>{data?.total_denials || 0}</strong>
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reasons.map((r, i) => {
          const pct = Math.round((r.claim_count / max) * 100);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 90px', gap: 12, alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>
                {r.reason}
              </div>
              <div style={{ background: '#f1f5f9', height: 22, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: 'linear-gradient(90deg, #ef4444, #f97316)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 8, color: '#fff', fontSize: 12, fontWeight: 600,
                }}>
                  {r.claim_count}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
                ${Number(r.revenue_impact || 0).toLocaleString()}
              </div>
            </div>
          );
        })}
        {reasons.length === 0 && <div style={{ color: '#64748b' }}>No denial data available.</div>}
      </div>
    </div>
  );
}
