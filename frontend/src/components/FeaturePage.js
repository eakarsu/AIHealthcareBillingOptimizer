import React, { useState, useEffect, useCallback } from 'react';
import DataTable from './DataTable';
import DetailModal from './DetailModal';
import NewItemModal from './NewItemModal';
import './FeaturePage.css';

export default function FeaturePage({
  title,
  description,
  columns,
  fields,
  fetchAll,
  createItem,
  updateItem,
  deleteItem,
  aiActions,
  readOnly,
  newItemLabel,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAll();
      const items = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.items || [];
      setData(items);
    } catch (err) {
      showToast('Failed to load data', 'error');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (formData) => {
    try {
      await createItem(formData);
      showToast('Record created successfully');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create record', 'error');
      throw err;
    }
  };

  const handleUpdate = async (id, formData) => {
    try {
      await updateItem(id, formData);
      showToast('Record updated successfully');
      setSelectedItem(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update record', 'error');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteItem(id);
      showToast('Record deleted successfully');
      setSelectedItem(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete record', 'error');
      throw err;
    }
  };

  return (
    <div className="feature-page">
      <div className="feature-page-header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={(row) => setSelectedItem(row)}
        onNewItem={readOnly ? null : () => setShowNew(true)}
        newItemLabel={newItemLabel || `New ${title.replace(/Management|Tracking|Monitoring|Verification|Optimization|Reports|Trail/gi, '').trim()}`}
        readOnly={readOnly}
      />

      {selectedItem && (
        <DetailModal
          item={selectedItem}
          fields={fields}
          title={`${title} Details`}
          onClose={() => setSelectedItem(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
          aiActions={aiActions}
          readOnly={readOnly}
        />
      )}

      {showNew && !readOnly && (
        <NewItemModal
          fields={fields.filter(f => !f.readOnly)}
          title={`Create New Record`}
          onClose={() => setShowNew(false)}
          onSubmit={handleCreate}
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
