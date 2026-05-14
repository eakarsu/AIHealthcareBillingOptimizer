import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getAgingReports, createAgingReport, updateAgingReport, deleteAgingReport, predictCollectionById } from '../services/api';

const columns = [
  { key: 'patient_id', label: 'Patient ID' },
  { key: 'claim_id', label: 'Claim ID' },
  { key: 'amount', label: 'Amount', type: 'money' },
  { key: 'aging_bucket', label: 'Aging Bucket', type: 'status' },
  { key: 'days_outstanding', label: 'Days Outstanding', type: 'number' },
  { key: 'last_action', label: 'Last Action' },
];

const fields = [
  { key: 'patient_id', label: 'Patient ID', required: true },
  { key: 'claim_id', label: 'Claim ID', required: true },
  { key: 'amount', label: 'Amount', type: 'money', required: true },
  { key: 'aging_bucket', label: 'Aging Bucket', type: 'select', options: ['0-30', '31-60', '61-90', '91-120', '120+'] },
  { key: 'days_outstanding', label: 'Days Outstanding', type: 'number' },
  { key: 'last_action', label: 'Last Action' },
];

const aiActions = [
  { label: 'Predict Collection', handler: predictCollectionById },
];

export default function AgingReportsPage() {
  return (
    <FeaturePage
      title="Aging Reports"
      description="Track accounts receivable aging"
      columns={columns}
      fields={fields}
      fetchAll={getAgingReports}
      createItem={createAgingReport}
      updateItem={updateAgingReport}
      deleteItem={deleteAgingReport}
      aiActions={aiActions}
    />
  );
}
