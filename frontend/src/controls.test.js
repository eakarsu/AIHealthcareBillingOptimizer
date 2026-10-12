import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import AdvancedAIToolsPage from './pages/AdvancedAIToolsPage';
import AIResultDisplay from './components/AIResultDisplay';
import LoginPage from './components/LoginPage';
import AIWorkspace from './components/AIWorkspace';
import AIAnalysisPage from './pages/AIAnalysisPage';
import { login, getAIAnalyses } from './services/api';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('./services/api', () => ({ login: jest.fn(), getAIAnalyses: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;
let host, root;
const render = async (element) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(element); await Promise.resolve(); });
};
const click = async (element) => act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === label);

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = null; host = null;
  jest.clearAllMocks();
});

test('native tool presets fill fields and preserve genuine record selections without generating', async () => {
  axios.get.mockImplementation((url) => Promise.resolve({ data: [{ id: url.includes('claims') ? 41 : 17, status: 'pending' }] }));
  axios.post.mockResolvedValue({ data: {} });
  await render(<AdvancedAIToolsPage />);
  for (const [tab, field] of [
    ['Denial Analyzer', '17'], ['Coding Recommender', '41'], ['Contract Analyzer', '17'],
    ['Compliance Checker', '17'], ['Appeal Generator', '17'], ['Aging Predictor', '17'],
    ['Claim Prioritizer', '41'], ['Prior Auth Prediction', '17'], ['Revenue Forecaster', '30'],
  ]) {
    await click(button(tab));
    for (const preset of ['Recent review', 'Focused follow-up', 'Executive review']) {
      await click(button(preset));
      const values = [...host.querySelectorAll('form select, form input, form textarea')].map(el => el.value);
      if (tab === 'Revenue Forecaster') expect(['30', '90', '365']).toContain(values[0]);
      else expect(values).toContain(field);
      expect(values.every(Boolean)).toBe(true);
      expect(axios.post).not.toHaveBeenCalled();
    }
  }
});

test('native presets leave missing record IDs empty and explain the prerequisite', async () => {
  axios.get.mockResolvedValue({ data: [] });
  await render(<AdvancedAIToolsPage />);
  await click(button('Recent review'));
  expect(host.querySelector('form input').value).toBe('');
  expect(host.textContent).toMatch(/No record is available/);
  expect(axios.post).not.toHaveBeenCalled();
});

test('structured output shows nested false, zero, empty strings, and table cells', async () => {
  await render(<AIResultDisplay result={{ review: { eligible: false, amount: 0, note: '' }, rows: [{ approved: false, balance: 0, comment: '' }] }} />);
  expect(host.textContent).toMatch(/Eligible/);
  expect(host.textContent).toMatch(/No/);
  expect(host.textContent).toMatch(/0/);
  expect(host.textContent).toMatch(/Empty string/);
  expect(host.querySelector('table')).not.toBeNull();
});

test('scalar false and zero results remain visible', async () => {
  await render(<AIResultDisplay result={false} />);
  expect(host.textContent).toMatch(/No/);
  await act(async () => root.render(<AIResultDisplay result={0} />));
  expect(host.textContent).toMatch(/0/);
});

test('saved analysis detail renders structured facts', async () => {
  getAIAnalyses.mockResolvedValue({ data: [{ id: 4, type: 'claim', entity_type: 'claim', entity_id: 12, result: { facts: { eligible: false, amount: 0, note: '' }, rows: [{ code: 'X1', count: 0 }] } }] });
  await render(<AIAnalysisPage />);
  await click(host.querySelector('.feature-page [style*="cursor: pointer"]'));
  expect(host.querySelector('.modal-body').textContent).toMatch(/Eligible/);
  expect(host.querySelector('.modal-body').textContent).toMatch(/No/);
  expect(host.querySelector('.modal-body').textContent).toMatch(/Empty string/);
});

test('demo credential button fills without submitting', async () => {
  const previousEmail = process.env.REACT_APP_DEMO_EMAIL;
  const previousPassword = process.env.REACT_APP_DEMO_PASSWORD;
  process.env.REACT_APP_DEMO_EMAIL = 'demo@example.test';
  process.env.REACT_APP_DEMO_PASSWORD = 'fixture-password';
  try {
    await render(<MemoryRouter><LoginPage /></MemoryRouter>);
    await click(button('Fill Demo Credentials'));
    expect(host.querySelector('#email').value).toBe('demo@example.test');
    expect(host.querySelector('#password').value).toBe('fixture-password');
    expect(login).not.toHaveBeenCalled();
  } finally {
    if (previousEmail === undefined) delete process.env.REACT_APP_DEMO_EMAIL;
    else process.env.REACT_APP_DEMO_EMAIL = previousEmail;
    if (previousPassword === undefined) delete process.env.REACT_APP_DEMO_PASSWORD;
    else process.env.REACT_APP_DEMO_PASSWORD = previousPassword;
  }
});

test('workspace presets fill optional inputs and returned and saved JSON render as sections', async () => {
  const saved = { id: 8, input: { goal: 'Review claim denials' }, result: { decision: { approved: false, amount: 0, note: '' }, findings: [{ payer: 'Example payer', count: 0 }] }, created_at: '2026-01-01T00:00:00Z', model: 'fixture-model' };
  const previousFetch = global.fetch;
  const calls = [];
  global.fetch = jest.fn((url, options = {}) => {
    calls.push({ url, method: options.method || 'GET' });
    return Promise.resolve({ ok: true, json: async () => url.endsWith('/run') ? { item: saved } : { items: [saved] } });
  });
  try {
    await render(<AIWorkspace feature={{ id: 'claim-review', title: 'Claim review', description: 'Review claim issues', samples: [] }} />);
    for (const preset of ['Scenario', 'Data sample', 'Executive review']) {
      await click(button(preset));
      const inputs = [...host.querySelectorAll('.ai-form-field textarea, .ai-form-field input, .ai-form-field select')];
      expect(inputs).toHaveLength(10);
      expect(inputs.every(el => el.value.trim())).toBe(true);
      expect(calls.every(call => call.method === 'GET')).toBe(true);
    }
    await click(button('Generate with OpenRouter'));
    expect(calls.filter(call => call.method === 'POST')).toHaveLength(1);
    expect(host.textContent).toMatch(/Decision/);
    expect(host.textContent).toMatch(/No/);
    expect(host.textContent).toMatch(/0/);
    await click(host.querySelector('.ai-history-row'));
    expect(document.querySelector('.ai-workspace-dialog')).not.toBeNull();
    expect(document.querySelector('.ai-workspace-dialog').textContent).toMatch(/Decision/);
  } finally {
    global.fetch = previousFetch;
  }
});
