import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getClaims, createClaim, updateClaim, deleteClaim, analyzeClaimDenialRisk } from '../services/api';

const columns = [
  { key: 'patient_name', label: 'Patient Name' },
  { key: 'insurance_id', label: 'Insurance ID' },
  { key: 'provider_name', label: 'Provider' },
  { key: 'service_date', label: 'Service Date', type: 'date' },
  { key: 'cpt_code', label: 'CPT Code' },
  { key: 'icd_code', label: 'ICD Code' },
  { key: 'billed_amount', label: 'Billed Amount', type: 'money' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'paid_amount', label: 'Paid Amount', type: 'money' },
];

const fields = [
  { key: 'patient_name', label: 'Patient Name', required: true },
  { key: 'insurance_id', label: 'Insurance ID', required: true },
  { key: 'provider_name', label: 'Provider Name', required: true },
  { key: 'service_date', label: 'Service Date', type: 'date', required: true },
  { key: 'cpt_code', label: 'CPT Code', required: true },
  { key: 'icd_code', label: 'ICD Code', required: true },
  { key: 'billed_amount', label: 'Billed Amount', type: 'money', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Submitted', 'Approved', 'Denied', 'Paid', 'Appealed'] },
  { key: 'paid_amount', label: 'Paid Amount', type: 'money' },
];

const aiActions = [
  { label: 'Analyze Denial Risk', handler: analyzeClaimDenialRisk },
];

export default function ClaimsPage() {
  return (
    <FeaturePage
      title="Claims Management"
      description="Manage and track all healthcare claims"
      columns={columns}
      fields={fields}
      fetchAll={getClaims}
      createItem={createClaim}
      updateItem={updateClaim}
      deleteItem={deleteClaim}
      aiActions={aiActions}
    />
  );
}
