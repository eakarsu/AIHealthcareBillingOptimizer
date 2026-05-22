import React, { useState } from 'react';
import API from '../services/api';

export default function AppealLetterPDF() {
  const [form, setForm] = useState({
    denial_id: '',
    claim_id: '',
    recipient: 'Blue Cross Blue Shield',
    patient_name: 'John Anderson',
    body: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const generate = async () => {
    setLoading(true);
    setStatus('');
    try {
      const payload = {};
      if (form.denial_id) payload.denial_id = Number(form.denial_id);
      if (form.claim_id) payload.claim_id = Number(form.claim_id);
      if (form.recipient) payload.recipient = form.recipient;
      if (form.patient_name) payload.patient_name = form.patient_name;
      if (form.body) payload.body = form.body;

      const res = await API.post('/custom-views/appeal-letter-pdf', payload, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appeal-letter-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('PDF generated and downloaded.');
    } catch (e) {
      setStatus('Error: ' + (e.message || 'failed'));
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1',
    borderRadius: 6, fontSize: 13, boxSizing: 'border-box',
  };

  return (
    <div data-testid="appeal-letter-pdf" style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ margin: '0 0 4px', color: '#0f172a' }}>Appeal Letter PDF Generator</h3>
      <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>
        Generate a downloadable PDF appeal letter for a denied claim.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#475569' }}>Denial ID (optional)</label>
          <input style={fieldStyle} value={form.denial_id} onChange={(e) => update('denial_id', e.target.value)} placeholder="e.g. 1" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#475569' }}>Claim ID (optional)</label>
          <input style={fieldStyle} value={form.claim_id} onChange={(e) => update('claim_id', e.target.value)} placeholder="e.g. 1042" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#475569' }}>Recipient (Payer)</label>
          <input style={fieldStyle} value={form.recipient} onChange={(e) => update('recipient', e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#475569' }}>Patient Name</label>
          <input style={fieldStyle} value={form.patient_name} onChange={(e) => update('patient_name', e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 12, color: '#475569' }}>Custom Letter Body (optional)</label>
        <textarea
          style={{ ...fieldStyle, minHeight: 100, fontFamily: 'inherit' }}
          value={form.body}
          onChange={(e) => update('body', e.target.value)}
          placeholder="Leave blank to use the default appeal template."
        />
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={generate}
          disabled={loading}
          data-testid="generate-pdf-btn"
          style={{
            background: '#2563eb', color: '#fff', border: 'none',
            padding: '10px 18px', borderRadius: 6, cursor: 'pointer',
            fontWeight: 600, fontSize: 13,
          }}
        >
          {loading ? 'Generating...' : 'Generate PDF'}
        </button>
        {status && <span style={{ fontSize: 13, color: status.startsWith('Error') ? '#c00' : '#16a34a' }}>{status}</span>}
      </div>
    </div>
  );
}
