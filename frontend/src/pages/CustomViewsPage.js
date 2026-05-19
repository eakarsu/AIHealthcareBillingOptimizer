import React from 'react';
import DenialReasonChart from '../components/DenialReasonChart';
import PayerMixHeatmap from '../components/PayerMixHeatmap';
import AppealLetterPDF from '../components/AppealLetterPDF';
import CodingRulesEditor from '../components/CodingRulesEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page" style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: 26 }}>Billing Views</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
          Custom healthcare billing optimization views: denial analytics, payer mix, appeal automation, and coding rules.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 20 }}>
        <DenialReasonChart />
        <PayerMixHeatmap />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <AppealLetterPDF />
        <CodingRulesEditor />
      </div>
    </div>
  );
}
