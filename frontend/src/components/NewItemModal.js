import React, { useState } from 'react';
import './NewItemModal.css';

export default function NewItemModal({ fields, title, onClose, onSubmit }) {
  const [formData, setFormData] = useState(() => {
    const init = {};
    fields.forEach(f => { init[f.key] = f.defaultValue || ''; });
    return init;
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    fields.forEach(f => {
      if (f.required && !formData[f.key]) {
        errs[f.key] = `${f.label} is required`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      // error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="newitem-overlay" onClick={handleOverlayClick}>
      <div className="newitem-content">
        <div className="newitem-header">
          <h2>{title || 'Create New Record'}</h2>
          <button className="newitem-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="newitem-body">
            <div className="newitem-form">
              {fields.map(field => (
                <div key={field.key} className={`newitem-field ${field.fullWidth ? 'full-width' : ''}`}>
                  <label htmlFor={`new-${field.key}`}>
                    {field.label} {field.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      id={`new-${field.key}`}
                      value={formData[field.key]}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className={errors[field.key] ? 'field-error' : ''}
                    >
                      <option value="">Select {field.label}...</option>
                      {(field.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      id={`new-${field.key}`}
                      rows={3}
                      value={formData[field.key]}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className={errors[field.key] ? 'field-error' : ''}
                    />
                  ) : (
                    <input
                      id={`new-${field.key}`}
                      type={
                        field.type === 'money' || field.type === 'number' ? 'number' :
                        field.type === 'date' ? 'date' :
                        field.type === 'email' ? 'email' : 'text'
                      }
                      step={field.type === 'money' ? '0.01' : undefined}
                      value={formData[field.key]}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder || ''}
                      className={errors[field.key] ? 'field-error' : ''}
                    />
                  )}
                  {errors[field.key] && <span className="error-msg">{errors[field.key]}</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="newitem-footer">
            <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn modal-btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
