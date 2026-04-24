import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getPriorAuths, createPriorAuth, updatePriorAuth, deletePriorAuth, analyzePriorAuth } from '../services/api';

const columns = [
  { key: 'patient_id', label: 'Patient ID' },
  { key: 'provider_id', label: 'Provider ID' },
  { key: 'service_description', label: 'Service Description' },
  { key: 'cpt_code', label: 'CPT Code' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'auth_number', label: 'Auth Number' },
  { key: 'submit_date', label: 'Submit Date', type: 'date' },
  { key: 'decision_date', label: 'Decision Date', type: 'date' },
];

const fields = [
  { key: 'patient_id', label: 'Patient ID', required: true },
  { key: 'provider_id', label: 'Provider ID', required: true },
  { key: 'service_description', label: 'Service Description', type: 'textarea', fullWidth: true, required: true },
  { key: 'cpt_code', label: 'CPT Code', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Submitted', 'Approved', 'Denied', 'Expired'] },
  { key: 'auth_number', label: 'Auth Number' },
  { key: 'submit_date', label: 'Submit Date', type: 'date' },
  { key: 'decision_date', label: 'Decision Date', type: 'date' },
];

const aiActions = [
  { label: 'Analyze Authorization', handler: analyzePriorAuth },
];

export default function PriorAuthPage() {
  return (
    <FeaturePage
      title="Prior Authorization"
      description="Manage prior authorization requests"
      columns={columns}
      fields={fields}
      fetchAll={getPriorAuths}
      createItem={createPriorAuth}
      updateItem={updatePriorAuth}
      deleteItem={deletePriorAuth}
      aiActions={aiActions}
    />
  );
}
