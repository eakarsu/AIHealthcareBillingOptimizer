import React from 'react';
import FeaturePage from '../components/FeaturePage';
import { getCodingOptimizations, createCodingOptimization, updateCodingOptimization, deleteCodingOptimization, optimizeCoding } from '../services/api';

const columns = [
  { key: 'claim_id', label: 'Claim ID' },
  { key: 'original_cpt', label: 'Original CPT' },
  { key: 'suggested_cpt', label: 'Suggested CPT' },
  { key: 'original_icd', label: 'Original ICD' },
  { key: 'suggested_icd', label: 'Suggested ICD' },
  { key: 'potential_revenue_change', label: 'Revenue Change', type: 'money' },
  { key: 'ai_confidence', label: 'AI Confidence', type: 'percent' },
  { key: 'status', label: 'Status', type: 'status' },
];

const fields = [
  { key: 'claim_id', label: 'Claim ID', required: true },
  { key: 'original_cpt', label: 'Original CPT Code', required: true },
  { key: 'suggested_cpt', label: 'Suggested CPT Code' },
  { key: 'original_icd', label: 'Original ICD Code', required: true },
  { key: 'suggested_icd', label: 'Suggested ICD Code' },
  { key: 'potential_revenue_change', label: 'Potential Revenue Change', type: 'money' },
  { key: 'ai_confidence', label: 'AI Confidence (%)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Review', 'Approved', 'Rejected', 'Optimized'] },
];

const aiActions = [
  { label: 'Optimize Coding', handler: optimizeCoding },
];

export default function CodingPage() {
  return (
    <FeaturePage
      title="Coding Optimization"
      description="AI-powered CPT and ICD code optimization"
      columns={columns}
      fields={fields}
      fetchAll={getCodingOptimizations}
      createItem={createCodingOptimization}
      updateItem={updateCodingOptimization}
      deleteItem={deleteCodingOptimization}
      aiActions={aiActions}
    />
  );
}
