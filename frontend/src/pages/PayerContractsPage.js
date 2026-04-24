import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getPayerContracts, createPayerContract, updatePayerContract, deletePayerContract, analyzeContract } from '../services/api';

const columns = [
  { key: 'payer_name', label: 'Payer Name' },
  { key: 'contract_number', label: 'Contract #' },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'end_date', label: 'End Date', type: 'date' },
  { key: 'fee_schedule_type', label: 'Fee Schedule' },
  { key: 'reimbursement_rate', label: 'Reimb. Rate', type: 'percent' },
  { key: 'status', label: 'Status', type: 'status' },
];

const fields = [
  { key: 'payer_name', label: 'Payer Name', required: true },
  { key: 'contract_number', label: 'Contract Number', required: true },
  { key: 'start_date', label: 'Start Date', type: 'date', required: true },
  { key: 'end_date', label: 'End Date', type: 'date', required: true },
  { key: 'fee_schedule_type', label: 'Fee Schedule Type', type: 'select', options: ['Fee-for-Service', 'Capitation', 'Per Diem', 'Case Rate', 'Percent of Charges'] },
  { key: 'reimbursement_rate', label: 'Reimbursement Rate (%)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Expired', 'Pending', 'Terminated'] },
];

const aiActions = [
  { label: 'Analyze Contract', handler: analyzeContract },
];

export default function PayerContractsPage() {
  return (
    <FeaturePage
      title="Payer Contracts"
      description="Manage payer contracts and fee schedules"
      columns={columns}
      fields={fields}
      fetchAll={getPayerContracts}
      createItem={createPayerContract}
      updateItem={updatePayerContract}
      deleteItem={deletePayerContract}
      aiActions={aiActions}
    />
  );
}
