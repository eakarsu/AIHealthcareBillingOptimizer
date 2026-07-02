import React, { useState, useEffect } from 'react';
import { deleteAuditEntry, getAuditTrail, updateAuditEntry } from '../services/api';
import DetailModal from '../components/DetailModal';

const ACTION_TYPES = ['ALL', 'POST', 'PUT', 'DELETE', 'PATCH', 'READ_PHI', 'READ_CLAIM'];

const actionColor = (action) => {
  if (!action) return 'badge-gray';
  const a = action.toUpperCase();
  if (a === 'DELETE') return 'badge-red';
  if (a === 'POST') return 'badge-green';
  if (a === 'PUT' || a === 'PATCH') return 'badge-blue';
  if (a.startsWith('READ')) return 'badge-yellow';
  return 'badge-gray';
};

export default function AuditTrailPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 50;

  const loadAuditTrail = () => {
    setLoading(true);
    getAuditTrail()
      .then(res => {
        const items = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
        setData(items);
      })
      .catch(() => setError('Failed to load audit trail'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdate = async (id, formData) => {
    await updateAuditEntry(id, formData);
    showToast('Audit entry updated');
    setSelectedEntry(null);
    loadAuditTrail();
  };

  const handleDelete = async (id) => {
    await deleteAuditEntry(id);
    showToast('Audit entry deleted');
    setSelectedEntry(null);
    loadAuditTrail();
  };

  const filtered = data.filter(row => {
    const matchesAction = actionFilter === 'ALL' || row.action === actionFilter;
    const matchesSearch = !search ||
      String(row.user_id || '').includes(search) ||
      String(row.entity_type || '').toLowerCase().includes(search.toLowerCase()) ||
      String(row.entity_id || '').includes(search) ||
      String(row.ip_address || '').includes(search);
    return matchesAction && matchesSearch;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const detailFields = [
    { key: 'id', label: 'Audit ID', readOnly: true },
    { key: 'timestamp', label: 'Timestamp', type: 'datetime', readOnly: true },
    { key: 'created_at', label: 'Created At', type: 'datetime', readOnly: true },
    { key: 'user_id', label: 'User ID', type: 'number' },
    { key: 'action', label: 'Action', type: 'badge' },
    { key: 'entity_type', label: 'Entity Type' },
    { key: 'entity_id', label: 'Entity ID', type: 'number' },
    { key: 'ip_address', label: 'IP Address' },
    { key: 'old_values', label: 'Old Values', type: 'textarea', fullWidth: true },
    { key: 'new_values', label: 'New Values', type: 'textarea', fullWidth: true },
  ];

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div>
          <h2>Audit Trail</h2>
          <p>View all system activity and access logs</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ACTION_TYPES.map(a => (
            <button key={a} onClick={() => { setActionFilter(a); setPage(1); }}
              style={{
                padding: '6px 14px', borderRadius: '20px', border: '1px solid',
                cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                backgroundColor: actionFilter === a ? '#4f46e5' : 'transparent',
                borderColor: actionFilter === a ? '#4f46e5' : '#d1d5db',
                color: actionFilter === a ? 'white' : '#6b7280',
              }}>
              {a}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search user, entity, IP..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{
            padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
            fontSize: '14px', minWidth: '200px',
          }}
        />
        <span style={{ color: '#6b7280', fontSize: '13px', marginLeft: 'auto' }}>
          {filtered.length} entries
        </span>
      </div>

      {loading && <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>Loading...</p>}
      {error && <p style={{ color: '#ef4444', padding: '16px' }}>{error}</p>}

      {!loading && !error && (
        <>
          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'IP Address'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                      No audit entries found.
                    </td>
                  </tr>
                ) : paginated.map((row, i) => (
                  <tr
                    key={row.id || i}
                    onClick={() => setSelectedEntry(row)}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    title="View audit entry details"
                  >
                    <td style={{ padding: '10px 16px', color: '#374151', whiteSpace: 'nowrap' }}>
                      {row.created_at || row.timestamp
                        ? new Date(row.created_at || row.timestamp).toLocaleString('en-US')
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#6b7280' }}>{row.user_id ?? '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className={`badge ${actionColor(row.action)}`}>{row.action || '—'}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>{row.entity_type ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#6b7280' }}>{row.entity_id ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: '#6b7280', fontFamily: 'monospace', fontSize: '12px' }}>
                      {row.ip_address ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                Previous
              </button>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedEntry && (
        <DetailModal
          item={selectedEntry}
          fields={detailFields}
          title="Audit Entry Details"
          onClose={() => setSelectedEntry(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? '\u2705' : '\u274c'} {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
