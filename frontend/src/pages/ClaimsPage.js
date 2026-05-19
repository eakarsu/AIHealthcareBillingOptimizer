import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getClaims, createClaim, updateClaim, deleteClaim, analyzeClaimDenialRisk, predictClaimRevenue } from '../services/api';

function HipaaBanner() {
  return (
    <div className="hipaa-banner">
      <span style={{ fontSize: '16px' }}>&#x1F512;</span>
      <span>
        <strong>HIPAA Notice:</strong> This system contains Protected Health Information (PHI). Access is logged and monitored.
        Unauthorized access or disclosure is prohibited.
      </span>
    </div>
  );
}

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
  { label: 'Denial Risk', handler: analyzeClaimDenialRisk },
  { label: 'Predict Revenue', handler: predictClaimRevenue },
];

export default function ClaimsPage() {
  return (
    <div>
      <HipaaBanner />
      <FeaturePage
        title="Claims Management"
        description="Manage and track all healthcare claims"
        columns={columns}
        fields={fields}
        fetchAll={getClaims}
        createItem={createClaim}
        updateItem={updateClaim}
        deleteClaim={deleteClaim}
        deleteItem={deleteClaim}
        aiActions={aiActions}
      />
    </div>
  );
}
