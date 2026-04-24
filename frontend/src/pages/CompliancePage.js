import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getComplianceRules, createComplianceRule, updateComplianceRule, deleteComplianceRule, checkCompliance } from '../services/api';

const columns = [
  { key: 'rule_name', label: 'Rule Name' },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'last_audit_date', label: 'Last Audit Date', type: 'date' },
  { key: 'risk_level', label: 'Risk Level', type: 'status' },
  { key: 'findings', label: 'Findings' },
];

const fields = [
  { key: 'rule_name', label: 'Rule Name', required: true },
  { key: 'category', label: 'Category', type: 'select', options: ['HIPAA', 'Billing', 'Coding', 'Documentation', 'Privacy', 'Security'], required: true },
  { key: 'description', label: 'Description', type: 'textarea', fullWidth: true, required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Compliant', 'Non-Compliant', 'Pending Review', 'In Progress'] },
  { key: 'last_audit_date', label: 'Last Audit Date', type: 'date' },
  { key: 'risk_level', label: 'Risk Level', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
  { key: 'findings', label: 'Findings', type: 'textarea', fullWidth: true },
];

const aiActions = [
  { label: 'Check Compliance', handler: checkCompliance },
];

export default function CompliancePage() {
  return (
    <FeaturePage
      title="Compliance Monitoring"
      description="Monitor and enforce healthcare compliance rules"
      columns={columns}
      fields={fields}
      fetchAll={getComplianceRules}
      createItem={createComplianceRule}
      updateItem={updateComplianceRule}
      deleteItem={deleteComplianceRule}
      aiActions={aiActions}
    />
  );
}
