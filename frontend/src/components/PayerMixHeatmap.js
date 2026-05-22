import React, { useEffect, useState } from 'react';
import API from '../services/api';

function colorFor(v, max) {
  if (!max) return '#f8fafc';
  const t = Math.min(1, v / max);
  // light to dark teal
  const r = Math.round(240 - t * 200);
  const g = Math.round(253 - t * 150);
  const b = Math.round(250 - t * 90);
  return `rgb(${r},${g},${b})`;
}

export default function PayerMixHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    API.get('/custom-views/payer-mix-heatmap')
      .then((r) => { if (mounted) { setData(r.data); setError(''); } })
      .catch((e) => { if (mounted) setError(e.message || 'Failed'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading payer mix...</div>;
  if (error) return <div style={{ padding: 16, color: '#c00' }}>Error: {error}</div>;
  const payers = data?.payers || [];
  const cpts = data?.cpt_codes || [];
  const matrix = data?.matrix || [];
  const max = Math.max(1, ...matrix.flat().map((c) => c.count || 0));

  return (
    <div data-testid="payer-mix-heatmap" style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ margin: '0 0 4px', color: '#0f172a' }}>Payer Mix Heatmap</h3>
      <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>
        Claim volume by payer (rows) and CPT procedure code (columns).
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: '4px 8px', textAlign: 'left', color: '#475569' }}>Payer \ CPT</th>
              {cpts.map((c) => (
                <th key={c} style={{ padding: '4px 8px', color: '#475569' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payers.map((p, ri) => (
              <tr key={p}>
                <td style={{ padding: '4px 8px', fontWeight: 600, color: '#1e293b' }}>{p}</td>
                {(matrix[ri] || []).map((cell, ci) => (
                  <td key={ci} title={`${cell.count} claims, $${cell.revenue}`}
                      style={{
                        padding: '10px 14px',
                        background: colorFor(cell.count, max),
                        textAlign: 'center',
                        borderRadius: 4,
                        color: cell.count / max > 0.55 ? '#fff' : '#0f172a',
                        fontWeight: 600,
                        minWidth: 50,
                      }}>
                    {cell.count}
                  </td>
                ))}
              </tr>
            ))}
            {payers.length === 0 && (
              <tr><td colSpan={Math.max(2, cpts.length + 1)} style={{ color: '#64748b', padding: 12 }}>No data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
