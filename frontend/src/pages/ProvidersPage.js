import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getProviders, createProvider, updateProvider, deleteProvider } from '../services/api';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'npi', label: 'NPI' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'tax_id', label: 'Tax ID' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'contract_rate', label: 'Contract Rate', type: 'money' },
];

const fields = [
  { key: 'name', label: 'Provider Name', required: true },
  { key: 'npi', label: 'NPI Number', required: true },
  { key: 'specialty', label: 'Specialty', required: true },
  { key: 'tax_id', label: 'Tax ID' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'contract_rate', label: 'Contract Rate', type: 'money' },
];

export default function ProvidersPage() {
  return (
    <FeaturePage
      title="Provider Management"
      description="Manage healthcare provider information"
      columns={columns}
      fields={fields}
      fetchAll={getProviders}
      createItem={createProvider}
      updateItem={updateProvider}
      deleteItem={deleteProvider}
    />
  );
}
