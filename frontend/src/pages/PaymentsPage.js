import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getPayments, createPayment, updatePayment, deletePayment } from '../services/api';

const columns = [
  { key: 'claim_id', label: 'Claim ID' },
  { key: 'patient_id', label: 'Patient ID' },
  { key: 'amount', label: 'Amount', type: 'money' },
  { key: 'payment_date', label: 'Payment Date', type: 'date' },
  { key: 'payment_method', label: 'Payment Method' },
  { key: 'reference_number', label: 'Reference #' },
  { key: 'status', label: 'Status', type: 'status' },
];

const fields = [
  { key: 'claim_id', label: 'Claim ID', required: true },
  { key: 'patient_id', label: 'Patient ID', required: true },
  { key: 'amount', label: 'Amount', type: 'money', required: true },
  { key: 'payment_date', label: 'Payment Date', type: 'date', required: true },
  { key: 'payment_method', label: 'Payment Method', type: 'select', options: ['Check', 'EFT', 'Credit Card', 'Cash', 'Wire Transfer'] },
  { key: 'reference_number', label: 'Reference Number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Completed', 'Failed', 'Refunded'] },
];

export default function PaymentsPage() {
  return (
    <FeaturePage
      title="Payment Tracking"
      description="Track and manage all payment transactions"
      columns={columns}
      fields={fields}
      fetchAll={getPayments}
      createItem={createPayment}
      updateItem={updatePayment}
      deleteItem={deletePayment}
    />
  );
}
