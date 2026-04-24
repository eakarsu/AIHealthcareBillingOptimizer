import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getAuditTrail } from '../services/api';

const columns = [
  { key: 'user_id', label: 'User ID' },
  { key: 'action', label: 'Action' },
  { key: 'entity_type', label: 'Entity Type' },
  { key: 'entity_id', label: 'Entity ID' },
  { key: 'timestamp', label: 'Timestamp', type: 'datetime' },
];

const fields = [
  { key: 'user_id', label: 'User ID', readOnly: true },
  { key: 'action', label: 'Action', readOnly: true },
  { key: 'entity_type', label: 'Entity Type', readOnly: true },
  { key: 'entity_id', label: 'Entity ID', readOnly: true },
  { key: 'timestamp', label: 'Timestamp', type: 'datetime', readOnly: true },
];

// Stub functions that are never called since readOnly = true
const noop = () => Promise.resolve();

export default function AuditTrailPage() {
  return (
    <FeaturePage
      title="Audit Trail"
      description="View all system activity and changes"
      columns={columns}
      fields={fields}
      fetchAll={getAuditTrail}
      createItem={noop}
      updateItem={noop}
      deleteItem={noop}
      readOnly
    />
  );
}
