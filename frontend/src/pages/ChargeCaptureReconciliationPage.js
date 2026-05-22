import React, { useEffect, useState } from 'react';

export default function ChargeCaptureReconciliationPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/charge-capture-reconciliation')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <div className="page"><h1>Charge Capture Reconciliation</h1><p>Loading reconciliation...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Charge Capture Reconciliation</h1>
        <p>Compare documented care, coding activity, and payer rules before claims leave prebill.</p>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><h3>{data.summary.encountersReviewed}</h3><p>Encounters Reviewed</p></div>
        <div className="stat-card"><h3>{data.summary.missingCharges}</h3><p>Missing Charges</p></div>
        <div className="stat-card"><h3>{data.summary.documentationMismatches}</h3><p>Documentation Mismatches</p></div>
        <div className="stat-card"><h3>${data.summary.projectedRecovery.toLocaleString()}</h3><p>Projected Recovery</p></div>
      </div>
      <div className="content-grid">
        <section className="card">
          <h2>Department Exposure</h2>
          {data.departments.map((item) => (
            <div className="list-item" key={item.name}>
              <strong>{item.name}</strong>
              <span>{item.missingCharges} missing charges - ${item.projectedRecovery.toLocaleString()} - {item.risk}</span>
            </div>
          ))}
        </section>
        <section className="card">
          <h2>Prebill Queue</h2>
          {data.queue.map((item) => (
            <div className="list-item" key={item.encounter}>
              <strong>{item.encounter} - {item.payer}</strong>
              <span>{item.issue}</span>
              <small>{item.action}</small>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
