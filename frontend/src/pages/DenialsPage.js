import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getDenials, createDenial, updateDenial, deleteDenial, suggestAppeal, analyzeDenialPattern, analyzeDenialPatterns } from '../services/api';

const columns = [
  { key: 'claim_id', label: 'Claim ID' },
  { key: 'denial_code', label: 'Denial Code' },
  { key: 'denial_reason', label: 'Denial Reason' },
  { key: 'denial_date', label: 'Denial Date', type: 'date' },
  { key: 'appeal_status', label: 'Appeal Status', type: 'status' },
  { key: 'revenue_impact', label: 'Revenue Impact', type: 'money' },
];

const fields = [
  { key: 'claim_id', label: 'Claim ID', required: true },
  { key: 'denial_code', label: 'Denial Code', required: true },
  { key: 'denial_reason', label: 'Denial Reason', type: 'textarea', fullWidth: true, required: true },
  { key: 'denial_date', label: 'Denial Date', type: 'date', required: true },
  { key: 'appeal_status', label: 'Appeal Status', type: 'select', options: ['Pending', 'In Progress', 'Submitted', 'Approved', 'Denied', 'Closed'] },
  { key: 'revenue_impact', label: 'Revenue Impact', type: 'money' },
];

const aiActions = [
  { label: 'Suggest Appeal', handler: suggestAppeal },
  { label: 'Analyze Pattern', handler: analyzeDenialPattern },
];

export default function DenialsPage() {
  return (
    <FeaturePage
      title="Denial Management"
      description="Track and manage claim denials and appeals"
      columns={columns}
      fields={fields}
      fetchAll={getDenials}
      createItem={createDenial}
      updateItem={updateDenial}
      deleteItem={deleteDenial}
      aiActions={aiActions}
    />
  );
}
