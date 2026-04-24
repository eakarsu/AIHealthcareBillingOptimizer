import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getInsuranceVerifications, createInsuranceVerification, updateInsuranceVerification, deleteInsuranceVerification, verifyInsurance } from '../services/api';

const columns = [
  { key: 'patient_id', label: 'Patient ID' },
  { key: 'insurance_provider', label: 'Insurance Provider' },
  { key: 'policy_number', label: 'Policy Number' },
  { key: 'verification_date', label: 'Verification Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'copay', label: 'Copay', type: 'money' },
  { key: 'deductible', label: 'Deductible', type: 'money' },
  { key: 'deductible_met', label: 'Deductible Met', type: 'money' },
];

const fields = [
  { key: 'patient_id', label: 'Patient ID', required: true },
  { key: 'insurance_provider', label: 'Insurance Provider', required: true },
  { key: 'policy_number', label: 'Policy Number', required: true },
  { key: 'verification_date', label: 'Verification Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Verified', 'Failed', 'Expired'] },
  { key: 'copay', label: 'Copay', type: 'money' },
  { key: 'deductible', label: 'Deductible', type: 'money' },
  { key: 'deductible_met', label: 'Deductible Met', type: 'money' },
];

const aiActions = [
  { label: 'Verify Insurance', handler: verifyInsurance },
];

export default function InsurancePage() {
  return (
    <FeaturePage
      title="Insurance Verification"
      description="Verify and manage insurance coverage"
      columns={columns}
      fields={fields}
      fetchAll={getInsuranceVerifications}
      createItem={createInsuranceVerification}
      updateItem={updateInsuranceVerification}
      deleteItem={deleteInsuranceVerification}
      aiActions={aiActions}
    />
  );
}
