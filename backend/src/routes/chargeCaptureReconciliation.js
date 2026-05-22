const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    feature: 'Charge Capture Reconciliation',
    summary: { encountersReviewed: 86, missingCharges: 14, documentationMismatches: 9, projectedRecovery: 42850 },
    departments: [
      { name: 'Emergency Medicine', missingCharges: 6, projectedRecovery: 18400, risk: 'high' },
      { name: 'Cardiology', missingCharges: 4, projectedRecovery: 13200, risk: 'medium' },
      { name: 'Radiology', missingCharges: 3, projectedRecovery: 8750, risk: 'medium' },
      { name: 'Outpatient Surgery', missingCharges: 1, projectedRecovery: 2500, risk: 'low' }
    ],
    queue: [
      { encounter: 'ENC-9042', payer: 'Blue Shield', issue: 'Procedure documented without CPT charge', action: 'Route to coder for CPT 93306 validation' },
      { encounter: 'ENC-9088', payer: 'Aetna', issue: 'Infusion duration supports additional unit', action: 'Request MAR confirmation before claim update' },
      { encounter: 'ENC-9120', payer: 'Medicare', issue: 'Modifier missing for bilateral service', action: 'Add modifier review to prebill workqueue' }
    ]
  });
});

module.exports = router;
