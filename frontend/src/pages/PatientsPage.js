import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getPatients, createPatient, updatePatient, deletePatient } from '../services/api';

const columns = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'dob', label: 'Date of Birth', type: 'date' },
  { key: 'insurance_provider', label: 'Insurance Provider' },
  { key: 'insurance_id', label: 'Insurance ID' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'balance_due', label: 'Balance Due', type: 'money' },
];

const fields = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'dob', label: 'Date of Birth', type: 'date', required: true },
  { key: 'insurance_provider', label: 'Insurance Provider', required: true },
  { key: 'insurance_id', label: 'Insurance ID', required: true },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'balance_due', label: 'Balance Due', type: 'money' },
];

export default function PatientsPage() {
  return (
    <FeaturePage
      title="Patient Billing"
      description="Manage patient information and billing records"
      columns={columns}
      fields={fields}
      fetchAll={getPatients}
      createItem={createPatient}
      updateItem={updatePatient}
      deleteItem={deletePatient}
    />
  );
}
