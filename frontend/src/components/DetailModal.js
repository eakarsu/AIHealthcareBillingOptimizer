import React, { useState } from 'react';
import AIResultDisplay from './AIResultDisplay';
import './DetailModal.css';

export default function DetailModal({
  item,
  fields,
  title,
  onClose,
  onSave,
  onDelete,
  aiActions,
  readOnly,
}) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  const handleEdit = () => {
    const data = {};
    fields.forEach(f => { data[f.key] = item[f.key] ?? ''; });
    setEditData(data);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item.id || item._id, editData);
      setEditing(false);
    } catch (err) {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete(item.id || item._id);
      onClose();
    } catch (err) {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleAI = async (action) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await action.handler(item.id || item._id);
      setAiResult(res.data);
    } catch (err) {
      if (err.response?.status === 429) {
        setAiResult({
          error: true,
          message: 'Rate limit reached. You can run up to 20 AI analyses per hour. Please try again later.',
        });
      } else {
        setAiResult({
          error: true,
          message: err.response?.data?.error || err.response?.data?.message || 'AI analysis failed. Please try again.',
        });
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const formatDisplay = (val, field) => {
    if (val === null || val === undefined || val === '') return '\u2014';
    if (field.type === 'money') {
      const n = parseFloat(val);
      return isNaN(n) ? val : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (field.type === 'date') {
      const d = new Date(val);
      return isNaN(d) ? val : d.toLocaleDateString('en-US');
    }
    if (field.type === 'datetime') {
      const d = new Date(val);
      return isNaN(d) ? val : d.toLocaleString('en-US');
    }
    if (field.type === 'status' || field.type === 'badge') {
      const cls = 'badge badge-' + String(val).toLowerCase().replace(/[\s/]+/g, '-');
      return <span className={cls}>{val}</span>;
    }
    return String(val);
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{title || 'Record Details'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="modal-fields">
            {fields.map(field => (
              <div key={field.key} className={`modal-field ${field.fullWidth ? 'full-width' : ''}`}>
                <span className="modal-field-label">{field.label}</span>
                {editing ? (
                  field.type === 'select' ? (
                    <select
                      className="modal-field-input select"
                      value={editData[field.key] || ''}
                      onChange={e => setEditData({ ...editData, [field.key]: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {(field.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      className="modal-field-input"
                      rows={3}
                      value={editData[field.key] || ''}
                      onChange={e => setEditData({ ...editData, [field.key]: e.target.value })}
                    />
                  ) : (
                    <input
                      className="modal-field-input"
                      type={field.type === 'money' || field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      step={field.type === 'money' ? '0.01' : undefined}
                      value={editData[field.key] || ''}
                      onChange={e => setEditData({ ...editData, [field.key]: e.target.value })}
                    />
                  )
                ) : (
                  <div className="modal-field-value">
                    {formatDisplay(item[field.key], field)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {confirmDelete && (
            <div className="modal-confirm-delete">
              <p>Are you sure you want to delete this record?</p>
              <div className="modal-confirm-delete-actions">
                <button className="modal-btn modal-btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
                <button className="modal-btn modal-btn-danger" onClick={handleDelete} disabled={saving}>
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}

          {(aiResult || aiLoading) && (
            <div className="modal-ai-section">
              <AIResultDisplay result={aiResult} loading={aiLoading} />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-footer-left">
            {!readOnly && !editing && (
              <>
                <button className="modal-btn modal-btn-primary" onClick={handleEdit}>
                  &#x270E; Edit
                </button>
                <button className="modal-btn modal-btn-danger" onClick={() => setConfirmDelete(true)}>
                  &#x1F5D1; Delete
                </button>
              </>
            )}
            {editing && (
              <>
                <button className="modal-btn modal-btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="modal-btn modal-btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </>
            )}
          </div>
          <div className="modal-footer-right">
            {aiActions && aiActions.map((action, i) => (
              <button
                key={i}
                className="modal-btn modal-btn-ai"
                onClick={() => handleAI(action)}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <>
                    <span className="spinner spinner-sm" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }}></span>
                    Analyzing...
                  </>
                ) : (
                  <>&#x1F9E0; {action.label}</>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
