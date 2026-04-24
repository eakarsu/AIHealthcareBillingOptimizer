import React, { useState, useEffect } from 'react';
import { getRevenueAnalytics, predictRevenue } from '../services/api';
import AIResultDisplay from '../components/AIResultDisplay';
import '../components/FeaturePage.css';

const barColors = ['#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#7c3aed', '#0891b2'];

function CSSBarChart({ data, label, maxVal }) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ marginBottom: 24 }}>
      <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#202124', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</h4>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, padding: '0 4px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#5f6368' }}>
              {typeof d.value === 'number' && d.value >= 1000 ? '$' + (d.value / 1000).toFixed(0) + 'k' : d.value}
            </span>
            <div
              style={{
                width: '100%',
                maxWidth: 48,
                height: `${Math.max((d.value / max) * 140, 4)}px`,
                background: `linear-gradient(to top, ${barColors[i % barColors.length]}, ${barColors[i % barColors.length]}dd)`,
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.8s ease',
              }}
            />
            <span style={{ fontSize: '0.625rem', color: '#5f6368', textAlign: 'center', lineHeight: 1.2 }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#202124' }}>{value}</div>
      <div style={{ fontSize: '0.8125rem', color: '#5f6368', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await getRevenueAnalytics();
        setAnalytics(res.data);
      } catch (err) {
        // Use fallback data
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handlePredictRevenue = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await predictRevenue();
      setAiResult(res.data);
    } catch (err) {
      setAiResult({ error: true, message: 'Revenue prediction failed. Please try again.' });
    } finally {
      setAiLoading(false);
    }
  };

  // Fallback demo data
  const stats = analytics || {};
  const revData = stats.revenue_by_month || [
    { label: 'Oct', value: 185000 },
    { label: 'Nov', value: 210000 },
    { label: 'Dec', value: 195000 },
    { label: 'Jan', value: 225000 },
    { label: 'Feb', value: 240000 },
    { label: 'Mar', value: 260000 },
  ];
  const denialData = stats.denials_by_reason || [
    { label: 'Missing Info', value: 35 },
    { label: 'Auth Required', value: 28 },
    { label: 'Not Covered', value: 22 },
    { label: 'Duplicate', value: 15 },
    { label: 'Untimely', value: 12 },
    { label: 'Other', value: 8 },
  ];
  const payerData = stats.revenue_by_payer || [
    { label: 'BlueCross', value: 450000 },
    { label: 'Aetna', value: 320000 },
    { label: 'UnitedHC', value: 280000 },
    { label: 'Cigna', value: 190000 },
    { label: 'Medicare', value: 350000 },
    { label: 'Medicaid', value: 150000 },
  ];

  if (loading) {
    return (
      <div className="feature-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-page" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#202124' }}>Analytics Dashboard</h2>
          <p style={{ fontSize: '0.8125rem', color: '#5f6368', marginTop: 2 }}>Revenue trends, denial statistics, and performance insights</p>
        </div>
        <button
          onClick={handlePredictRevenue}
          disabled={aiLoading}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #7c3aed, #1a73e8)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
            opacity: aiLoading ? 0.7 : 1,
          }}
        >
          {'\ud83e\udde0'} {aiLoading ? 'Predicting...' : 'AI Predict Revenue'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Revenue (YTD)" value={'$' + (stats.total_revenue || 1740000).toLocaleString()} icon={'\ud83d\udcb0'} color="#34a853" />
        <StatCard label="Claims Processed" value={(stats.claims_processed || 3842).toLocaleString()} icon={'\ud83d\udccb'} color="#1a73e8" />
        <StatCard label="Avg Reimbursement" value={'$' + (stats.avg_reimbursement || 452).toLocaleString()} icon={'\ud83d\udcb3'} color="#7c3aed" />
        <StatCard label="Collection Rate" value={(stats.collection_rate || 94.2) + '%'} icon={'\ud83c\udfaf'} color="#0891b2" />
        <StatCard label="Total Denials" value={(stats.total_denials || 120).toLocaleString()} icon={'\u26d4'} color="#ea4335" />
        <StatCard label="Clean Claim Rate" value={(stats.clean_claim_rate || 91.5) + '%'} icon={'\u2705'} color="#34a853" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <CSSBarChart data={revData} label="Monthly Revenue" />
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <CSSBarChart data={denialData} label="Denials by Reason" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <CSSBarChart data={payerData} label="Revenue by Payer" />
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h4 style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#202124', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Performance Indicators</h4>
          {[
            { label: 'Claims Approval Rate', value: stats.approval_rate || 87.3, color: '#34a853' },
            { label: 'First Pass Rate', value: stats.first_pass_rate || 82.1, color: '#1a73e8' },
            { label: 'Clean Claim Rate', value: stats.clean_claim_rate || 91.5, color: '#7c3aed' },
            { label: 'Collection Rate', value: stats.collection_rate || 94.2, color: '#0891b2' },
          ].map((kpi, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#202124' }}>{kpi.label}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: kpi.color }}>{kpi.value}%</span>
              </div>
              <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${kpi.value}%`, background: kpi.color, borderRadius: 4, transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {(aiResult || aiLoading) && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <AIResultDisplay result={aiResult} loading={aiLoading} />
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        </div>
      )}
    </div>
  );
}
