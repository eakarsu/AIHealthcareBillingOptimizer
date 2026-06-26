import React from 'react';
import './AIResultDisplay.css';

function getRiskLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function RiskBar({ label, score }) {
  const level = getRiskLevel(score);
  return (
    <div className="ai-risk-bar-container">
      <div className="ai-risk-bar-header">
        <span className="ai-risk-label">{label}</span>
        <span className={`ai-risk-value risk-text-${level}`}>{score}%</span>
      </div>
      <div className="ai-risk-bar">
        <div className={`ai-risk-bar-fill risk-${level}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function humanizeLabel(value) {
  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => {
    if (typeof item === 'string') return item;
    return item.finding || item.description || item.text || item.title || item.recommendation || item.action || JSON.stringify(item);
  });
}

function NarrativeText({ text }) {
  const lines = String(text)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  return (
    <div className="ai-narrative">
      {lines.map((line, index) => {
        const heading = line.replace(/^#{1,4}\s*/, '');
        const bullet = line.match(/^[-*]\s+(.+)/);
        const numbered = line.match(/^(\d+)[.)]\s+(.+)/);
        const isHeading = /^#{1,4}\s+/.test(line) || (/^[A-Z][A-Za-z\s/&-]+:$/.test(line) && line.length < 70);

        if (isHeading) {
          return <h4 key={index}>{heading.replace(/:$/, '')}</h4>;
        }

        if (bullet || numbered) {
          return (
            <div key={index} className="ai-narrative-item">
              <span>{numbered ? index + 1 : '\u2022'}</span>
              <p>{(bullet && bullet[1]) || (numbered && numbered[2])}</p>
            </div>
          );
        }

        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

function parseAIContent(data) {
  // The AI result can come in different shapes. We try to extract structured parts.
  const result = {
    title: null,
    summary: null,
    riskScores: [],
    recommendations: [],
    findings: [],
    confidence: null,
    appealLetter: null,
    metrics: [],
    narrativeText: null,
    rawText: null,
  };

  if (!data) return result;

  // Handle string response
  if (typeof data === 'string') {
    result.rawText = data;
    return result;
  }

  // Direct fields
  const d = data.data || data.result || data.analysis || data;

  if (typeof d === 'string') {
    result.narrativeText = d;
    return result;
  }

  result.title = d.title || d.feature || null;

  const responseText = d.result || d.response || d.output || d.content || d.ai_response || null;
  if (typeof responseText === 'string') {
    result.narrativeText = responseText;
  }

  // Summary
  result.summary = d.summary || d.description || d.overview || d.analysis_summary || null;

  // Risk scores
  if (d.risk_score !== undefined) {
    result.riskScores.push({ label: 'Overall Risk', score: parseFloat(d.risk_score) });
  }
  if (d.denial_risk !== undefined) {
    result.riskScores.push({ label: 'Denial Risk', score: parseFloat(d.denial_risk) });
  }
  if (d.compliance_risk !== undefined) {
    result.riskScores.push({ label: 'Compliance Risk', score: parseFloat(d.compliance_risk) });
  }
  if (d.risk_scores && typeof d.risk_scores === 'object') {
    Object.entries(d.risk_scores).forEach(([k, v]) => {
      result.riskScores.push({ label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), score: parseFloat(v) });
    });
  }
  if (d.risk_level) {
    const riskMap = { low: 20, medium: 50, high: 75, critical: 95 };
    const score = riskMap[d.risk_level.toLowerCase()] || 50;
    result.riskScores.push({ label: 'Risk Level', score });
  }

  // Confidence
  if (d.confidence !== undefined) {
    result.confidence = parseFloat(d.confidence);
    if (result.confidence <= 1) result.confidence = Math.round(result.confidence * 100);
  }
  if (d.ai_confidence !== undefined) {
    result.confidence = parseFloat(d.ai_confidence);
    if (result.confidence <= 1) result.confidence = Math.round(result.confidence * 100);
  }

  // Recommendations
  if (Array.isArray(d.recommendations)) {
    result.recommendations = d.recommendations.map(r =>
      typeof r === 'string' ? { title: r, description: '' } :
      { title: r.title || r.recommendation || r.action || '', description: r.description || r.details || r.reason || '' }
    );
  }
  if (Array.isArray(d.suggestions)) {
    result.recommendations = d.suggestions.map(s =>
      typeof s === 'string' ? { title: s, description: '' } :
      { title: s.title || s.suggestion || '', description: s.description || '' }
    );
  }
  if (Array.isArray(d.action_plan)) {
    result.recommendations = normalizeList(d.action_plan).map(item => ({ title: item, description: '' }));
  }
  if (Array.isArray(d.next_steps)) {
    result.recommendations = normalizeList(d.next_steps).map(item => ({ title: item, description: '' }));
  }

  // Findings
  if (Array.isArray(d.findings)) {
    result.findings = d.findings.map(f => typeof f === 'string' ? f : f.finding || f.description || f.text || JSON.stringify(f));
  }
  if (Array.isArray(d.issues)) {
    result.findings = d.issues.map(f => typeof f === 'string' ? f : f.issue || f.description || JSON.stringify(f));
  }
  if (Array.isArray(d.key_findings)) {
    result.findings = d.key_findings.map(f => typeof f === 'string' ? f : f.finding || JSON.stringify(f));
  }
  if (Array.isArray(d.assumptions)) {
    result.findings = [...result.findings, ...normalizeList(d.assumptions).map(item => `Assumption: ${item}`)];
  }
  if (Array.isArray(d.follow_up_questions)) {
    result.findings = [...result.findings, ...normalizeList(d.follow_up_questions).map(item => `Follow-up: ${item}`)];
  }

  // Appeal letter
  if (d.appeal_letter || d.appeal || d.letter) {
    result.appealLetter = d.appeal_letter || d.appeal || d.letter;
  }

  // Metrics
  if (d.metrics && typeof d.metrics === 'object' && !Array.isArray(d.metrics)) {
    Object.entries(d.metrics).forEach(([k, v]) => {
      result.metrics.push({
        label: humanizeLabel(k),
        value: typeof v === 'number' ? (v > 1000 ? '$' + v.toLocaleString() : v) : v,
      });
    });
  }
  if (d.predicted_revenue !== undefined) {
    result.metrics.push({ label: 'Predicted Revenue', value: '$' + parseFloat(d.predicted_revenue).toLocaleString() });
  }
  if (d.potential_savings !== undefined) {
    result.metrics.push({ label: 'Potential Savings', value: '$' + parseFloat(d.potential_savings).toLocaleString() });
  }
  if (d.collection_probability !== undefined) {
    result.metrics.push({ label: 'Collection Probability', value: parseFloat(d.collection_probability).toFixed(1) + '%' });
  }
  if (d.revenue_impact !== undefined) {
    result.metrics.push({ label: 'Revenue Impact', value: '$' + parseFloat(d.revenue_impact).toLocaleString() });
  }
  if (d.potential_revenue_change !== undefined) {
    result.metrics.push({ label: 'Revenue Change', value: '$' + parseFloat(d.potential_revenue_change).toLocaleString() });
  }

  // If nothing was parsed, show raw
  const hasContent = result.summary || result.riskScores.length || result.recommendations.length ||
    result.findings.length || result.confidence !== null || result.appealLetter || result.metrics.length ||
    result.narrativeText;

  if (!hasContent) {
    result.rawText = JSON.stringify(d, null, 2);
  }

  return result;
}

const recIcons = ['\u2705', '\ud83d\udca1', '\ud83d\udcdd', '\u26a0\ufe0f', '\ud83d\udd27', '\ud83d\udcca', '\ud83d\udee1\ufe0f', '\ud83c\udfaf'];

export default function AIResultDisplay({ result, loading }) {
  if (loading) {
    return (
      <div className="ai-loading">
        <div className="ai-loading-dots">
          <div className="ai-loading-dot" />
          <div className="ai-loading-dot" />
          <div className="ai-loading-dot" />
        </div>
        <span className="ai-loading-text">AI is analyzing your data...</span>
      </div>
    );
  }

  if (!result) return null;

  if (result.error) {
    return (
      <div className="ai-error">
        <span>{'\u26a0\ufe0f'}</span>
        {result.message || 'An error occurred during AI analysis.'}
      </div>
    );
  }

  const parsed = parseAIContent(result);

  return (
    <div className="ai-result">
      <div className="ai-result-header">
        <div className="ai-result-header-icon">{'\ud83e\udde0'}</div>
        <div>
          <h3>{parsed.title || 'AI Analysis Results'}</h3>
          <span>Powered by AI Healthcare Intelligence</span>
        </div>
      </div>

      {parsed.summary && (
        <div className="ai-summary">{parsed.summary}</div>
      )}

      {parsed.narrativeText && (
        <NarrativeText text={parsed.narrativeText} />
      )}

      {parsed.confidence !== null && (
        <div className="ai-confidence">
          <span className="ai-confidence-label">AI Confidence</span>
          <div className="ai-confidence-bar">
            <div className="ai-confidence-fill" style={{ width: `${parsed.confidence}%` }} />
          </div>
          <span className="ai-confidence-value">{parsed.confidence}%</span>
          <span className={`confidence-badge ${parsed.confidence > 80 ? 'confidence-high' : parsed.confidence >= 50 ? 'confidence-medium' : 'confidence-low'}`}>
            {parsed.confidence > 80 ? 'High' : parsed.confidence >= 50 ? 'Medium' : 'Low'}
          </span>
        </div>
      )}

      {parsed.riskScores.length > 0 && (
        <div className="ai-risk-section">
          <div className="ai-section-title">Risk Assessment</div>
          {parsed.riskScores.map((rs, i) => (
            <RiskBar key={i} label={rs.label} score={rs.score} />
          ))}
        </div>
      )}

      {parsed.metrics.length > 0 && (
        <div>
          <div className="ai-section-title">Key Metrics</div>
          <div className="ai-metrics">
            {parsed.metrics.map((m, i) => (
              <div key={i} className="ai-metric-card">
                <div className="ai-metric-value">{m.value}</div>
                <div className="ai-metric-label">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parsed.recommendations.length > 0 && (
        <div className="ai-recommendations">
          <div className="ai-section-title">Recommendations</div>
          {parsed.recommendations.map((rec, i) => (
            <div key={i} className="ai-rec-card">
              <span className="ai-rec-icon">{recIcons[i % recIcons.length]}</span>
              <div className="ai-rec-content">
                <div className="ai-rec-title">{rec.title}</div>
                {rec.description && <div className="ai-rec-desc">{rec.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {parsed.findings.length > 0 && (
        <div className="ai-findings">
          <div className="ai-section-title">Key Findings</div>
          {parsed.findings.map((f, i) => (
            <div key={i} className="ai-finding">
              <span className="ai-finding-icon">{'\u25cf'}</span>
              <span className="ai-finding-text">{f}</span>
            </div>
          ))}
        </div>
      )}

      {parsed.appealLetter && (
        <div>
          <div className="ai-appeal-letter-header">
            <h4>Appeal Letter</h4>
            <button
              className="ai-copy-btn"
              onClick={() => { navigator.clipboard.writeText(parsed.appealLetter); }}
            >
              Copy to Clipboard
            </button>
          </div>
          <div className="ai-appeal-letter">{parsed.appealLetter}</div>
        </div>
      )}

      {parsed.rawText && (
        <div>
          <div className="ai-section-title">Full Response</div>
          <pre className="ai-raw">{parsed.rawText}</pre>
        </div>
      )}
    </div>
  );
}
