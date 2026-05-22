import React, { useEffect, useState } from 'react';
import API from '../services/api';

const BLANK = { icd_code: '', cpt_code: '', modifier: '', description: '', active: true };

export default function CodingRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(BLANK);

  const load = async () => {
    setLoading(true);
    try {
      const r = await API.get('/custom-views/coding-rules');
      setRules(r.data?.rules || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.icd_code || !draft.cpt_code) {
      setError('ICD and CPT required');
      return;
    }
    try {
      await API.post('/custom-views/coding-rules', draft);
      setDraft(BLANK);
      load();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setEditDraft({ ...rule });
  };

  const saveEdit = async () => {
    try {
      await API.put(`/custom-views/coding-rules/${editingId}`, editDraft);
      setEditingId(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await API.delete(`/custom-views/coding-rules/${id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const cellInput = (val, onChange, ph = '') => (
    <input value={val} onChange={(e) => onChange(e.target.value)} placeholder={ph}
      style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
  );

  return (
    <div data-testid="coding-rules-editor" style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <h3 style={{ margin: '0 0 4px', color: '#0f172a' }}>Medical Coding Rules Editor</h3>
      <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 13 }}>
        Manage ICD-10 / CPT mappings and modifier rules. Changes persist for the server session.
      </p>
      {error && <div style={{ color: '#c00', marginBottom: 10, fontSize: 13 }}>{error}</div>}
      {loading ? <div>Loading rules...</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>ICD-10</th>
                <th style={{ padding: 8 }}>CPT</th>
                <th style={{ padding: 8 }}>Modifier</th>
                <th style={{ padding: 8 }}>Description</th>
                <th style={{ padding: 8 }}>Active</th>
                <th style={{ padding: 8, width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => {
                const isEdit = editingId === r.id;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 8 }}>{isEdit ? cellInput(editDraft.icd_code, (v) => setEditDraft((d) => ({ ...d, icd_code: v }))) : r.icd_code}</td>
                    <td style={{ padding: 8 }}>{isEdit ? cellInput(editDraft.cpt_code, (v) => setEditDraft((d) => ({ ...d, cpt_code: v }))) : r.cpt_code}</td>
                    <td style={{ padding: 8 }}>{isEdit ? cellInput(editDraft.modifier, (v) => setEditDraft((d) => ({ ...d, modifier: v }))) : (r.modifier || '-')}</td>
                    <td style={{ padding: 8 }}>{isEdit ? cellInput(editDraft.description, (v) => setEditDraft((d) => ({ ...d, description: v }))) : r.description}</td>
                    <td style={{ padding: 8 }}>
                      {isEdit ? (
                        <input type="checkbox" checked={!!editDraft.active} onChange={(e) => setEditDraft((d) => ({ ...d, active: e.target.checked }))} />
                      ) : (
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: r.active ? '#dcfce7' : '#fee2e2',
                          color: r.active ? '#166534' : '#991b1b',
                        }}>{r.active ? 'Yes' : 'No'}</span>
                      )}
                    </td>
                    <td style={{ padding: 8 }}>
                      {isEdit ? (
                        <>
                          <button onClick={saveEdit} style={btnPrimary}>Save</button>
                          <button onClick={() => setEditingId(null)} style={btnGhost}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(r)} style={btnGhost} data-testid={`edit-rule-${r.id}`}>Edit</button>
                          <button onClick={() => remove(r.id)} style={btnDanger} data-testid={`delete-rule-${r.id}`}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: 8 }}>{cellInput(draft.icd_code, (v) => setDraft({ ...draft, icd_code: v }), 'e.g. I10')}</td>
                <td style={{ padding: 8 }}>{cellInput(draft.cpt_code, (v) => setDraft({ ...draft, cpt_code: v }), 'e.g. 99213')}</td>
                <td style={{ padding: 8 }}>{cellInput(draft.modifier, (v) => setDraft({ ...draft, modifier: v }), '25/59/...')}</td>
                <td style={{ padding: 8 }}>{cellInput(draft.description, (v) => setDraft({ ...draft, description: v }), 'description')}</td>
                <td style={{ padding: 8 }}>
                  <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                </td>
                <td style={{ padding: 8 }}>
                  <button onClick={create} style={btnPrimary} data-testid="add-rule-btn">Add Rule</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const btnPrimary = {
  background: '#2563eb', color: '#fff', border: 'none',
  padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, marginRight: 6,
};
const btnGhost = {
  background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1',
  padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, marginRight: 6,
};
const btnDanger = {
  background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca',
  padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
  fontSize: 12, fontWeight: 600,
};
