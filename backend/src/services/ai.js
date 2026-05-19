const fetch = require('node-fetch');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function parseAIJson(text) {
  try { return JSON.parse(text); } catch (e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').trim();
  try { return JSON.parse(stripped); } catch (e) {}
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) { try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {} }
  return null;
}

async function callOpenRouter(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return { error: 'OpenRouter API key not configured', fallback: true };
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:4000',
        'X-Title': 'AI Healthcare Billing Optimizer',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    if (data.error) {
      return { error: data.error.message || 'OpenRouter API error', fallback: true };
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { error: 'No response from AI', fallback: true };
    }

    // Try to parse JSON using robust parser
    const parsed = parseAIJson(content);
    if (parsed) {
      return { result: parsed, raw: content, model };
    }

    return { result: content, raw: content, model };
  } catch (err) {
    return { error: err.message, fallback: true };
  }
}

async function analyzeClaimDenialRisk(claimData) {
  const systemPrompt = `You are a healthcare billing AI expert. Analyze the claim data and predict denial risk. Return JSON with fields: risk_level (low/medium/high), risk_score (0-100), denial_probability (percentage), risk_factors (array of strings), recommendations (array of strings), summary (string).`;
  const userPrompt = `Analyze this healthcare claim for denial risk:\n${JSON.stringify(claimData, null, 2)}`;
  return callOpenRouter(systemPrompt, userPrompt);
}

async function optimizeCoding(claimData) {
  const systemPrompt = `You are a medical coding optimization expert. Analyze the claim's CPT and ICD codes and suggest optimizations. Return JSON with fields: original_cpt, suggested_cpt, original_icd, suggested_icd, rationale (string), potential_revenue_change (number), confidence (0-100), recommendations (array of strings).`;
  const userPrompt = `Optimize the medical coding for this claim:\n${JSON.stringify(claimData, null, 2)}`;
  return callOpenRouter(systemPrompt, userPrompt);
}

async function analyzeDenialPattern(denials) {
  const systemPrompt = `You are a healthcare denial management expert. Analyze denial patterns and identify trends. Return JSON with fields: patterns (array of objects with pattern, frequency, impact), root_causes (array of strings), recommendations (array of strings), summary (string), projected_savings (number).`;
  const userPrompt = `Analyze these denial patterns:\n${JSON.stringify(denials, null, 2)}`;
  return callOpenRouter(systemPrompt, userPrompt);
}

async function predictRevenue(claims) {
  const systemPrompt = `You are a healthcare revenue cycle analyst. Predict revenue based on claims data. Return JSON with fields: predicted_revenue (number), confidence_interval (object with low and high), trends (array of strings), risks (array of strings), recommendations (array of strings), monthly_forecast (array of objects with month, amount).`;
  const userPrompt = `Predict revenue based on these claims:\n${JSON.stringify(claims, null, 2)}`;
  return callOpenRouter(systemPrompt, userPrompt);
}

async function verifyCompliance(record) {
  const systemPrompt = `You are a healthcare compliance expert. Verify compliance status and identify issues. Return JSON with fields: compliant (boolean), issues (array of objects with issue, severity, recommendation), risk_level (low/medium/high), action_items (array of strings), summary (string).`;
  const userPrompt = `Check compliance for this record:\n${JSON.stringify(record, null, 2)}`;
  return callOpenRouter(systemPrompt, userPrompt);
}

async function suggestAppeal(denial) {
  const systemPrompt = `You are a healthcare appeals specialist. Generate a professional appeal letter and strategy for the denied claim. Return JSON with fields: appeal_letter (string), strategy (string), success_probability (percentage), key_arguments (array of strings), supporting_documentation (array of strings), timeline (string).`;
  const userPrompt = `Generate an appeal for this denial:\n${JSON.stringify(denial, null, 2)}`;
  return callOpenRouter(systemPrompt, userPrompt);
}

async function analyzePayerContract(contract) {
  const systemPrompt = `You are a healthcare payer contract analyst. Analyze the contract terms and identify optimization opportunities. Return JSON with fields: overall_rating (1-10), strengths (array of strings), weaknesses (array of strings), negotiation_points (array of strings), market_comparison (string), recommendations (array of strings), estimated_impact (number).`;
  const userPrompt = `Analyze this payer contract:\n${JSON.stringify(contract, null, 2)}`;
  return callOpenRouter(systemPrompt, userPrompt);
}

async function predictAging(agingData) {
  const systemPrompt = `You are a healthcare accounts receivable specialist. Predict collection probability for aging accounts. Return JSON with fields: collection_probability (percentage), recommended_actions (array of objects with action, priority, expected_recovery), write_off_risk (percentage), escalation_needed (boolean), summary (string), total_expected_recovery (number).`;
  const userPrompt = `Predict collections for these aging accounts:\n${JSON.stringify(agingData, null, 2)}`;
  return callOpenRouter(systemPrompt, userPrompt);
}

// ---------- Apply pass 5 backlog ---------- //

async function predictPriorAuth(request) {
  const systemPrompt = `You are a prior authorization expert. Given a prior-auth request (payer, service, patient_context, supporting_codes, clinical_notes), predict approval likelihood and recommend documentation. Return JSON: approval_probability (0-100), confidence (0-100), likely_objections (array of strings), recommended_documentation (array of strings), suggested_codes (array of strings), turnaround_estimate_days (number), escalation_path (string), summary (string). DISCLAIMER: This is a workflow advisory tool, not clinical advice.`;
  const userPrompt = `Predict prior auth outcome for this request:\n${JSON.stringify(request, null, 2)}`;
  return callOpenRouter(systemPrompt, userPrompt);
}

async function prioritizeClaims(claims) {
  const systemPrompt = `You are a claims prioritization analyst. Rank a batch of claims by approval likelihood, denial risk, and expected revenue. Return JSON: ranked (array of {claim_id, score (0-100), priority ("urgent","high","medium","low"), reason, expected_revenue, denial_risk, recommended_action}), summary (string), bottlenecks (array of strings).`;
  const userPrompt = `Prioritize these claims:\n${JSON.stringify(claims, null, 2)}`;
  return callOpenRouter(systemPrompt, userPrompt);
}

module.exports = {
  analyzeClaimDenialRisk,
  optimizeCoding,
  analyzeDenialPattern,
  predictRevenue,
  verifyCompliance,
  suggestAppeal,
  analyzePayerContract,
  predictAging,
  predictPriorAuth,
  prioritizeClaims,
  callOpenRouter,
};
