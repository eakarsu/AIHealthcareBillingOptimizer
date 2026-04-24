import React, { useState, useEffect } from 'react';
import { getAIAnalyses } from '../services/api';
import AIResultDisplay from '../components/AIResultDisplay';
import '../components/FeaturePage.css';
import '../components/DetailModal.css';

export default function AIAnalysisPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getAIAnalyses();
        const items = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setAnalyses(items);
      } catch (err) {
        setAnalyses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = analyses.filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.type && a.type.toLowerCase().includes(q)) ||
      (a.entity_type && a.entity_type.toLowerCase().includes(q)) ||
      (a.entity_id && String(a.entity_id).includes(q))
    );
  });

  const getTypeColor = (type) => {
    const map = {
      'denial-risk': '#ea4335',
      'appeal': '#7c3aed',
      'compliance': '#1a73e8',
      'coding': '#34a853',
      'collections': '#0891b2',
      'insurance': '#fbbc04',
      'contract': '#ff6b35',
      'revenue': '#34a853',
    };
    const key = Object.keys(map).find(k => (type || '').toLowerCase().includes(k));
    return key ? map[key] : '#1a73e8';
  };

  if (loading) {
    return (
      <div className="feature-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading AI analyses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-page" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#202124' }}>AI Analysis History</h2>
        <p style={{ fontSize: '0.8125rem', color: '#5f6368', marginTop: 2 }}>View all past AI analysis results</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#f8f9fa',
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          padding: '8px 14px',
          maxWidth: 360,
        }}>
          <span style={{ color: '#5f6368' }}>{'\ud83d\udd0d'}</span>
          <input
            type="text"
            placeholder="Search analyses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%', outline: 'none' }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '48px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.5 }}>{'\ud83e\udde0'}</div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#5f6368' }}>No AI analyses found</div>
          <div style={{ fontSize: '0.8125rem', color: '#5f6368', marginTop: 4 }}>Run an AI analysis from any feature page to see results here</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {filtered.map((analysis, i) => (
            <div
              key={analysis.id || analysis._id || i}
              onClick={() => setSelected(analysis)}
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid transparent',
                borderLeft: `4px solid ${getTypeColor(analysis.type)}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: getTypeColor(analysis.type) + '15',
                  color: getTypeColor(analysis.type),
                  textTransform: 'capitalize',
                }}>
                  {(analysis.type || 'Analysis').replace(/-/g, ' ')}
                </span>
                {analysis.confidence && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1a73e8' }}>
                    {(analysis.confidence > 1 ? analysis.confidence : (analysis.confidence * 100).toFixed(0))}% confidence
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#202124', marginBottom: 4 }}>
                {analysis.entity_type ? `${analysis.entity_type} #${analysis.entity_id}` : `Analysis #${analysis.id || i + 1}`}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#5f6368' }}>
                {analysis.created_at ? new Date(analysis.created_at).toLocaleString('en-US') : 'Recently'}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="modal-content" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>AI Analysis Result</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#5f6368', fontWeight: 600, textTransform: 'uppercase' }}>Type</span>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'capitalize' }}>{(selected.type || 'Analysis').replace(/-/g, ' ')}</div>
                  </div>
                  {selected.entity_type && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#5f6368', fontWeight: 600, textTransform: 'uppercase' }}>Entity</span>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{selected.entity_type} #{selected.entity_id}</div>
                    </div>
                  )}
                  {selected.created_at && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#5f6368', fontWeight: 600, textTransform: 'uppercase' }}>Date</span>
                      <div style={{ fontSize: '0.875rem' }}>{new Date(selected.created_at).toLocaleString('en-US')}</div>
                    </div>
                  )}
                </div>
              </div>
              <AIResultDisplay result={selected.result || selected} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
