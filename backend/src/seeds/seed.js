const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const {
  getConnectionFields,
  getTargetDatabaseName,
  quoteIdentifier,
} = require('../dbConfig');

const DB_NAME = getTargetDatabaseName();

async function seed() {
  // Connect to default 'postgres' db to create/drop the target database
  const adminPool = new Pool(getConnectionFields('postgres'));

  try {
    // Terminate existing connections to the database
    await adminPool.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1 AND pid <> pg_backend_pid()
    `, [DB_NAME]);

    // Drop and recreate database
    await adminPool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(DB_NAME)}`);
    await adminPool.query(`CREATE DATABASE ${quoteIdentifier(DB_NAME)}`);
    console.log(`Database ${DB_NAME} created successfully.`);
  } catch (err) {
    console.error('Error creating database:', err.message);
    // Database might already exist with active connections, try to continue
  } finally {
    await adminPool.end();
  }

  // Connect to the newly created database
  const pool = new Pool(getConnectionFields(DB_NAME));

  try {
    // Create all tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS claims (
        id SERIAL PRIMARY KEY,
        patient_name VARCHAR(255),
        patient_dob DATE,
        insurance_id VARCHAR(100),
        provider_name VARCHAR(255),
        service_date DATE,
        cpt_code VARCHAR(20),
        icd_code VARCHAR(20),
        billed_amount DECIMAL(12,2) DEFAULT 0,
        allowed_amount DECIMAL(12,2) DEFAULT 0,
        paid_amount DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'submitted',
        denial_reason TEXT,
        submission_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS denials (
        id SERIAL PRIMARY KEY,
        claim_id INTEGER REFERENCES claims(id) ON DELETE CASCADE,
        denial_code VARCHAR(50),
        denial_reason TEXT,
        denial_date DATE DEFAULT CURRENT_DATE,
        appeal_status VARCHAR(50) DEFAULT 'none',
        appeal_date DATE,
        resolution TEXT,
        revenue_impact DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        dob DATE,
        insurance_provider VARCHAR(255),
        insurance_id VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(255),
        address TEXT,
        balance_due DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        claim_id INTEGER REFERENCES claims(id) ON DELETE SET NULL,
        patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_date DATE DEFAULT CURRENT_DATE,
        payment_method VARCHAR(50),
        reference_number VARCHAR(100),
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS providers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        npi VARCHAR(20),
        specialty VARCHAR(255),
        tax_id VARCHAR(20),
        address TEXT,
        phone VARCHAR(20),
        email VARCHAR(255),
        contract_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS insurance_verifications (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        insurance_provider VARCHAR(255),
        policy_number VARCHAR(100),
        group_number VARCHAR(100),
        verification_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'pending',
        coverage_details TEXT,
        copay DECIMAL(8,2) DEFAULT 0,
        deductible DECIMAL(8,2) DEFAULT 0,
        deductible_met DECIMAL(8,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS prior_authorizations (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
        provider_id INTEGER REFERENCES providers(id) ON DELETE SET NULL,
        service_description TEXT,
        cpt_code VARCHAR(20),
        icd_code VARCHAR(20),
        status VARCHAR(50) DEFAULT 'pending',
        auth_number VARCHAR(50),
        submit_date DATE DEFAULT CURRENT_DATE,
        decision_date DATE,
        expiry_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS compliance_records (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        status VARCHAR(50) DEFAULT 'compliant',
        last_audit_date DATE,
        next_audit_date DATE,
        findings TEXT,
        risk_level VARCHAR(20) DEFAULT 'low',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payer_contracts (
        id SERIAL PRIMARY KEY,
        payer_name VARCHAR(255) NOT NULL,
        contract_number VARCHAR(100),
        start_date DATE,
        end_date DATE,
        fee_schedule_type VARCHAR(100),
        reimbursement_rate DECIMAL(5,2) DEFAULT 0,
        terms TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS aging_reports (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
        claim_id INTEGER REFERENCES claims(id) ON DELETE SET NULL,
        amount DECIMAL(12,2) DEFAULT 0,
        aging_bucket VARCHAR(20) DEFAULT '0-30',
        days_outstanding INTEGER DEFAULT 0,
        last_action TEXT,
        last_action_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS coding_optimizations (
        id SERIAL PRIMARY KEY,
        claim_id INTEGER REFERENCES claims(id) ON DELETE SET NULL,
        original_cpt VARCHAR(20),
        suggested_cpt VARCHAR(20),
        original_icd VARCHAR(20),
        suggested_icd VARCHAR(20),
        potential_revenue_change DECIMAL(12,2) DEFAULT 0,
        ai_confidence DECIMAL(5,2) DEFAULT 0,
        recommendation TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_trail (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(50),
        timestamp TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_analysis_results (
        id SERIAL PRIMARY KEY,
        analysis_type VARCHAR(100),
        entity_id INTEGER,
        entity_type VARCHAR(100),
        input_data JSONB,
        ai_response JSONB,
        model_used VARCHAR(100),
        confidence_score DECIMAL(5,2) DEFAULT 0,
        recommendations TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('All tables created successfully.');

    // Seed users
    const passwordHash = await bcrypt.hash('admin123', 10);

    await pool.query(`
      INSERT INTO users (email, password_hash, name, role) VALUES
      ('admin@healthbilling.com', $1, 'Admin User', 'admin'),
      ('dr.smith@healthbilling.com', $1, 'Dr. Sarah Smith', 'doctor'),
      ('billing@healthbilling.com', $1, 'Jane Billing', 'billing')
    `, [passwordHash]);
    console.log('Users seeded.');

    // Seed patients (15+)
    await pool.query(`
      INSERT INTO patients (first_name, last_name, dob, insurance_provider, insurance_id, phone, email, address, balance_due) VALUES
      ('John', 'Anderson', '1985-03-15', 'Blue Cross Blue Shield', 'BCBS-001234', '555-0101', 'john.anderson@email.com', '123 Oak St, Springfield, IL 62701', 250.00),
      ('Maria', 'Garcia', '1972-07-22', 'Aetna', 'AET-005678', '555-0102', 'maria.garcia@email.com', '456 Elm Ave, Chicago, IL 60601', 0.00),
      ('Robert', 'Williams', '1990-11-08', 'UnitedHealthcare', 'UHC-009012', '555-0103', 'r.williams@email.com', '789 Pine Rd, Naperville, IL 60540', 1250.00),
      ('Sarah', 'Johnson', '1968-05-30', 'Cigna', 'CIG-003456', '555-0104', 'sarah.j@email.com', '321 Maple Dr, Evanston, IL 60201', 500.00),
      ('James', 'Brown', '1955-12-01', 'Medicare', 'MED-007890', '555-0105', 'james.brown@email.com', '654 Cedar Ln, Peoria, IL 61602', 75.00),
      ('Emily', 'Davis', '1998-09-14', 'Blue Cross Blue Shield', 'BCBS-002345', '555-0106', 'emily.d@email.com', '987 Birch Ct, Champaign, IL 61820', 0.00),
      ('Michael', 'Wilson', '1980-01-25', 'Humana', 'HUM-006789', '555-0107', 'michael.w@email.com', '147 Walnut St, Rockford, IL 61101', 3200.00),
      ('Jennifer', 'Martinez', '1975-04-17', 'Aetna', 'AET-001234', '555-0108', 'jen.martinez@email.com', '258 Cherry Blvd, Decatur, IL 62521', 150.00),
      ('David', 'Taylor', '1962-08-09', 'UnitedHealthcare', 'UHC-005678', '555-0109', 'david.t@email.com', '369 Ash Way, Joliet, IL 60432', 800.00),
      ('Lisa', 'Thomas', '1988-02-28', 'Cigna', 'CIG-009012', '555-0110', 'lisa.thomas@email.com', '741 Spruce Ave, Aurora, IL 60505', 0.00),
      ('Christopher', 'Jackson', '1945-06-15', 'Medicare', 'MED-003456', '555-0111', 'chris.j@email.com', '852 Hickory Rd, Bloomington, IL 61701', 425.00),
      ('Amanda', 'White', '1993-10-20', 'Blue Cross Blue Shield', 'BCBS-007890', '555-0112', 'amanda.w@email.com', '963 Poplar Dr, Normal, IL 61761', 0.00),
      ('Daniel', 'Harris', '1978-03-03', 'Humana', 'HUM-002345', '555-0113', 'daniel.h@email.com', '174 Willow Ln, Springfield, IL 62704', 2100.00),
      ('Jessica', 'Clark', '1986-12-11', 'Aetna', 'AET-006789', '555-0114', 'jessica.c@email.com', '285 Dogwood Ct, Champaign, IL 61821', 350.00),
      ('Kevin', 'Lewis', '1970-07-07', 'UnitedHealthcare', 'UHC-001234', '555-0115', 'kevin.l@email.com', '396 Redwood St, Peoria, IL 61603', 900.00),
      ('Rachel', 'Robinson', '1995-01-19', 'Cigna', 'CIG-005678', '555-0116', 'rachel.r@email.com', '507 Sycamore Ave, Evanston, IL 60202', 0.00)
    `);
    console.log('Patients seeded.');

    // Seed providers (15+)
    await pool.query(`
      INSERT INTO providers (name, npi, specialty, tax_id, address, phone, email, contract_rate) VALUES
      ('Dr. Sarah Smith', '1234567890', 'Family Medicine', '12-3456789', '100 Medical Center Dr, Springfield, IL', '555-1001', 'dr.smith@medcenter.com', 85.00),
      ('Dr. Michael Chen', '2345678901', 'Cardiology', '23-4567890', '200 Heart Institute Blvd, Chicago, IL', '555-1002', 'dr.chen@heartinst.com', 92.00),
      ('Dr. Emily Rodriguez', '3456789012', 'Orthopedics', '34-5678901', '300 Bone & Joint Clinic, Naperville, IL', '555-1003', 'dr.rodriguez@ortho.com', 88.00),
      ('Dr. James Wilson', '4567890123', 'Dermatology', '45-6789012', '400 Skin Care Center, Evanston, IL', '555-1004', 'dr.wilson@skincare.com', 80.00),
      ('Dr. Patricia Lee', '5678901234', 'Pediatrics', '56-7890123', '500 Children Health Center, Peoria, IL', '555-1005', 'dr.lee@kidhealth.com', 78.00),
      ('Dr. Robert Johnson', '6789012345', 'Internal Medicine', '67-8901234', '600 Internal Med Associates, Chicago, IL', '555-1006', 'dr.johnson@internal.com', 83.00),
      ('Dr. Linda Martinez', '7890123456', 'Neurology', '78-9012345', '700 Brain & Spine Institute, Rockford, IL', '555-1007', 'dr.martinez@neuro.com', 90.00),
      ('Dr. William Brown', '8901234567', 'Gastroenterology', '89-0123456', '800 GI Health Center, Joliet, IL', '555-1008', 'dr.brown@gihealth.com', 87.00),
      ('Dr. Karen Davis', '9012345678', 'Endocrinology', '90-1234567', '900 Diabetes & Hormone Clinic, Aurora, IL', '555-1009', 'dr.davis@endo.com', 85.00),
      ('Dr. Thomas Anderson', '0123456789', 'Pulmonology', '01-2345678', '1000 Lung Health Center, Bloomington, IL', '555-1010', 'dr.anderson@pulmo.com', 86.00),
      ('Dr. Susan Taylor', '1122334455', 'Oncology', '11-2233445', '1100 Cancer Treatment Center, Springfield, IL', '555-1011', 'dr.taylor@oncology.com', 95.00),
      ('Dr. Richard White', '2233445566', 'Urology', '22-3344556', '1200 Urology Associates, Champaign, IL', '555-1012', 'dr.white@urology.com', 84.00),
      ('Dr. Nancy Clark', '3344556677', 'Psychiatry', '33-4455667', '1300 Mental Health Center, Decatur, IL', '555-1013', 'dr.clark@mentalhealth.com', 82.00),
      ('Dr. Joseph Harris', '4455667788', 'Ophthalmology', '44-5567788', '1400 Eye Care Institute, Normal, IL', '555-1014', 'dr.harris@eyecare.com', 81.00),
      ('Dr. Margaret Lewis', '5566778899', 'Rheumatology', '55-6677889', '1500 Arthritis & Joint Center, Peoria, IL', '555-1015', 'dr.lewis@rheuma.com', 86.00),
      ('Dr. Charles Robinson', '6677889900', 'Emergency Medicine', '66-7788990', '1600 ER Associates, Chicago, IL', '555-1016', 'dr.robinson@emed.com', 90.00)
    `);
    console.log('Providers seeded.');

    // Seed claims (15+)
    await pool.query(`
      INSERT INTO claims (patient_name, patient_dob, insurance_id, provider_name, service_date, cpt_code, icd_code, billed_amount, allowed_amount, paid_amount, status, denial_reason, submission_date) VALUES
      ('John Anderson', '1985-03-15', 'BCBS-001234', 'Dr. Sarah Smith', '2025-12-01', '99213', 'J06.9', 150.00, 120.00, 120.00, 'approved', NULL, '2025-12-05'),
      ('Maria Garcia', '1972-07-22', 'AET-005678', 'Dr. Michael Chen', '2025-12-03', '99214', 'I10', 250.00, 200.00, 200.00, 'approved', NULL, '2025-12-07'),
      ('Robert Williams', '1990-11-08', 'UHC-009012', 'Dr. Emily Rodriguez', '2025-12-05', '99215', 'M54.5', 350.00, 280.00, 0.00, 'denied', 'Prior authorization required', '2025-12-09'),
      ('Sarah Johnson', '1968-05-30', 'CIG-003456', 'Dr. James Wilson', '2025-12-07', '99213', 'L70.0', 150.00, 130.00, 130.00, 'approved', NULL, '2025-12-11'),
      ('James Brown', '1955-12-01', 'MED-007890', 'Dr. Patricia Lee', '2025-12-09', '99214', 'E11.9', 250.00, 220.00, 0.00, 'pending', NULL, '2025-12-13'),
      ('Emily Davis', '1998-09-14', 'BCBS-002345', 'Dr. Robert Johnson', '2025-12-11', '99212', 'J02.9', 100.00, 85.00, 85.00, 'approved', NULL, '2025-12-15'),
      ('Michael Wilson', '1980-01-25', 'HUM-006789', 'Dr. Linda Martinez', '2025-12-13', '99215', 'G43.909', 400.00, 320.00, 0.00, 'denied', 'Medical necessity not established', '2025-12-17'),
      ('Jennifer Martinez', '1975-04-17', 'AET-001234', 'Dr. William Brown', '2025-12-15', '99214', 'K21.0', 250.00, 210.00, 210.00, 'approved', NULL, '2025-12-19'),
      ('David Taylor', '1962-08-09', 'UHC-005678', 'Dr. Karen Davis', '2025-12-17', '99213', 'E11.65', 175.00, 150.00, 0.00, 'submitted', NULL, '2025-12-21'),
      ('Lisa Thomas', '1988-02-28', 'CIG-009012', 'Dr. Thomas Anderson', '2025-12-19', '99214', 'J45.20', 275.00, 230.00, 230.00, 'approved', NULL, '2025-12-23'),
      ('Christopher Jackson', '1945-06-15', 'MED-003456', 'Dr. Susan Taylor', '2025-12-21', '99215', 'C34.90', 500.00, 450.00, 0.00, 'denied', 'Duplicate claim', '2025-12-25'),
      ('Amanda White', '1993-10-20', 'BCBS-007890', 'Dr. Richard White', '2025-12-23', '99213', 'N39.0', 160.00, 135.00, 135.00, 'approved', NULL, '2025-12-27'),
      ('Daniel Harris', '1978-03-03', 'HUM-002345', 'Dr. Nancy Clark', '2025-12-25', '99214', 'F41.1', 300.00, 250.00, 0.00, 'appealed', 'Session not covered under plan', '2025-12-29'),
      ('Jessica Clark', '1986-12-11', 'AET-006789', 'Dr. Joseph Harris', '2025-12-27', '99213', 'H52.1', 180.00, 155.00, 155.00, 'approved', NULL, '2025-12-31'),
      ('Kevin Lewis', '1970-07-07', 'UHC-001234', 'Dr. Margaret Lewis', '2025-12-29', '99215', 'M06.9', 380.00, 310.00, 0.00, 'pending', NULL, '2026-01-02'),
      ('Rachel Robinson', '1995-01-19', 'CIG-005678', 'Dr. Charles Robinson', '2026-01-01', '99281', 'S61.0', 450.00, 400.00, 400.00, 'approved', NULL, '2026-01-05'),
      ('John Anderson', '1985-03-15', 'BCBS-001234', 'Dr. Sarah Smith', '2026-01-03', '99214', 'J06.9', 220.00, 180.00, 0.00, 'submitted', NULL, '2026-01-07'),
      ('Maria Garcia', '1972-07-22', 'AET-005678', 'Dr. Michael Chen', '2026-01-05', '93000', 'I25.10', 350.00, 300.00, 300.00, 'approved', NULL, '2026-01-09')
    `);
    console.log('Claims seeded.');

    // Seed denials (15+)
    await pool.query(`
      INSERT INTO denials (claim_id, denial_code, denial_reason, denial_date, appeal_status, appeal_date, resolution, revenue_impact) VALUES
      (3, 'CO-197', 'Prior authorization required', '2025-12-12', 'pending', '2025-12-20', NULL, 280.00),
      (7, 'CO-50', 'Medical necessity not established', '2025-12-20', 'submitted', '2025-12-28', NULL, 320.00),
      (11, 'CO-18', 'Duplicate claim', '2025-12-28', 'none', NULL, NULL, 450.00),
      (13, 'PR-96', 'Session not covered under plan', '2026-01-01', 'approved', '2026-01-10', 'Appeal approved, payment pending', 250.00),
      (3, 'CO-4', 'Procedure code inconsistent with modifier', '2025-12-14', 'denied', '2025-12-22', 'Appeal denied, coding error confirmed', 280.00),
      (7, 'CO-11', 'Diagnosis inconsistent with procedure', '2025-12-22', 'pending', '2025-12-30', NULL, 320.00),
      (5, 'PR-1', 'Deductible not met', '2025-12-16', 'none', NULL, NULL, 220.00),
      (9, 'CO-29', 'Time limit for filing has expired', '2025-12-24', 'submitted', '2026-01-02', NULL, 150.00),
      (11, 'PR-2', 'Coinsurance amount', '2025-12-30', 'none', NULL, NULL, 90.00),
      (15, 'CO-16', 'Claim lacks information', '2026-01-05', 'pending', '2026-01-12', NULL, 310.00),
      (3, 'CO-151', 'Prior authorization not obtained timely', '2025-12-15', 'submitted', '2025-12-23', NULL, 280.00),
      (7, 'CO-27', 'Expenses incurred after coverage terminated', '2025-12-23', 'none', NULL, NULL, 320.00),
      (17, 'PR-3', 'Co-payment amount', '2026-01-10', 'none', NULL, NULL, 40.00),
      (5, 'CO-45', 'Charges exceed contracted amount', '2025-12-18', 'none', NULL, NULL, 30.00),
      (9, 'CO-B7', 'Provider not certified for this procedure', '2025-12-26', 'pending', '2026-01-04', NULL, 150.00),
      (15, 'CO-109', 'Claim not covered by this payer', '2026-01-07', 'submitted', '2026-01-15', NULL, 310.00)
    `);
    console.log('Denials seeded.');

    // Seed payments (15+)
    await pool.query(`
      INSERT INTO payments (claim_id, patient_id, amount, payment_date, payment_method, reference_number, status) VALUES
      (1, 1, 120.00, '2025-12-15', 'insurance', 'PAY-20251215-001', 'completed'),
      (2, 2, 200.00, '2025-12-17', 'insurance', 'PAY-20251217-002', 'completed'),
      (4, 4, 130.00, '2025-12-21', 'insurance', 'PAY-20251221-003', 'completed'),
      (6, 6, 85.00, '2025-12-25', 'insurance', 'PAY-20251225-004', 'completed'),
      (8, 8, 210.00, '2025-12-29', 'insurance', 'PAY-20251229-005', 'completed'),
      (10, 10, 230.00, '2026-01-02', 'insurance', 'PAY-20260102-006', 'completed'),
      (12, 12, 135.00, '2026-01-06', 'insurance', 'PAY-20260106-007', 'completed'),
      (14, 14, 155.00, '2026-01-10', 'insurance', 'PAY-20260110-008', 'completed'),
      (16, 16, 400.00, '2026-01-14', 'insurance', 'PAY-20260114-009', 'completed'),
      (18, 2, 300.00, '2026-01-18', 'insurance', 'PAY-20260118-010', 'completed'),
      (1, 1, 30.00, '2025-12-20', 'credit_card', 'PAY-20251220-011', 'completed'),
      (4, 4, 20.00, '2025-12-26', 'check', 'PAY-20251226-012', 'completed'),
      (6, 6, 15.00, '2025-12-30', 'debit_card', 'PAY-20251230-013', 'completed'),
      (3, 3, 50.00, '2026-01-05', 'credit_card', 'PAY-20260105-014', 'pending'),
      (7, 7, 80.00, '2026-01-08', 'cash', 'PAY-20260108-015', 'completed'),
      (13, 13, 50.00, '2026-01-12', 'credit_card', 'PAY-20260112-016', 'completed')
    `);
    console.log('Payments seeded.');

    // Seed insurance verifications (15+)
    await pool.query(`
      INSERT INTO insurance_verifications (patient_id, insurance_provider, policy_number, group_number, verification_date, status, coverage_details, copay, deductible, deductible_met) VALUES
      (1, 'Blue Cross Blue Shield', 'POL-BCBS-001234', 'GRP-BCBS-100', '2025-12-01', 'verified', 'PPO plan, 80/20 coverage after deductible', 30.00, 2500.00, 1800.00),
      (2, 'Aetna', 'POL-AET-005678', 'GRP-AET-200', '2025-12-03', 'verified', 'HMO plan, full coverage with referral', 25.00, 1500.00, 1500.00),
      (3, 'UnitedHealthcare', 'POL-UHC-009012', 'GRP-UHC-300', '2025-12-05', 'verified', 'EPO plan, in-network only', 35.00, 3000.00, 500.00),
      (4, 'Cigna', 'POL-CIG-003456', 'GRP-CIG-400', '2025-12-07', 'verified', 'PPO plan, 70/30 coverage', 40.00, 2000.00, 2000.00),
      (5, 'Medicare', 'POL-MED-007890', NULL, '2025-12-09', 'verified', 'Medicare Part B, 80% coverage', 0.00, 233.00, 233.00),
      (6, 'Blue Cross Blue Shield', 'POL-BCBS-002345', 'GRP-BCBS-500', '2025-12-11', 'verified', 'PPO plan, 80/20 coverage', 30.00, 2500.00, 800.00),
      (7, 'Humana', 'POL-HUM-006789', 'GRP-HUM-600', '2025-12-13', 'pending', 'Verification in progress', 45.00, 4000.00, 0.00),
      (8, 'Aetna', 'POL-AET-001234', 'GRP-AET-700', '2025-12-15', 'verified', 'POS plan, tiered coverage', 30.00, 1500.00, 1200.00),
      (9, 'UnitedHealthcare', 'POL-UHC-005678', 'GRP-UHC-800', '2025-12-17', 'verified', 'PPO plan, 80/20 coverage', 35.00, 3000.00, 2200.00),
      (10, 'Cigna', 'POL-CIG-009012', 'GRP-CIG-900', '2025-12-19', 'verified', 'HMO plan, copay only', 20.00, 0.00, 0.00),
      (11, 'Medicare', 'POL-MED-003456', NULL, '2025-12-21', 'verified', 'Medicare Part A & B', 0.00, 233.00, 233.00),
      (12, 'Blue Cross Blue Shield', 'POL-BCBS-007890', 'GRP-BCBS-110', '2025-12-23', 'expired', 'Policy expired, needs renewal', 30.00, 2500.00, 2500.00),
      (13, 'Humana', 'POL-HUM-002345', 'GRP-HUM-120', '2025-12-25', 'denied', 'Coverage terminated', 0.00, 0.00, 0.00),
      (14, 'Aetna', 'POL-AET-006789', 'GRP-AET-130', '2025-12-27', 'verified', 'PPO plan, vision included', 25.00, 1500.00, 900.00),
      (15, 'UnitedHealthcare', 'POL-UHC-001234', 'GRP-UHC-140', '2025-12-29', 'verified', 'EPO plan, specialty referral needed', 35.00, 3000.00, 1500.00),
      (16, 'Cigna', 'POL-CIG-005678', 'GRP-CIG-150', '2026-01-01', 'pending', 'New enrollment, pending verification', 20.00, 1000.00, 0.00)
    `);
    console.log('Insurance verifications seeded.');

    // Seed prior authorizations (15+)
    await pool.query(`
      INSERT INTO prior_authorizations (patient_id, provider_id, service_description, cpt_code, icd_code, status, auth_number, submit_date, decision_date, expiry_date, notes) VALUES
      (1, 1, 'MRI of lumbar spine', '72148', 'M54.5', 'approved', 'AUTH-2025-001', '2025-12-01', '2025-12-05', '2026-03-05', 'Standard approval for diagnostic imaging'),
      (2, 2, 'Cardiac catheterization', '93458', 'I25.10', 'approved', 'AUTH-2025-002', '2025-12-03', '2025-12-07', '2026-03-07', 'Urgent cardiac procedure approved'),
      (3, 3, 'Knee arthroscopy', '29881', 'M23.611', 'pending', NULL, '2025-12-05', NULL, NULL, 'Awaiting peer review'),
      (4, 4, 'Mohs surgery', '17311', 'C44.319', 'approved', 'AUTH-2025-004', '2025-12-07', '2025-12-10', '2026-03-10', 'Approved for basal cell carcinoma'),
      (5, 5, 'Colonoscopy with biopsy', '45380', 'K63.5', 'approved', 'AUTH-2025-005', '2025-12-09', '2025-12-12', '2026-03-12', 'Routine screening approved'),
      (6, 6, 'CT scan abdomen', '74177', 'R10.9', 'denied', NULL, '2025-12-11', '2025-12-15', NULL, 'Does not meet medical necessity criteria'),
      (7, 7, 'EMG nerve conduction study', '95907', 'G62.9', 'approved', 'AUTH-2025-007', '2025-12-13', '2025-12-17', '2026-03-17', 'Neuropathy evaluation approved'),
      (8, 8, 'Upper endoscopy', '43239', 'K21.0', 'approved', 'AUTH-2025-008', '2025-12-15', '2025-12-19', '2026-03-19', 'GERD evaluation approved'),
      (9, 9, 'Continuous glucose monitor', '95251', 'E11.65', 'pending', NULL, '2025-12-17', NULL, NULL, 'Requires documentation of insulin use'),
      (10, 10, 'Pulmonary function test', '94010', 'J45.20', 'approved', 'AUTH-2025-010', '2025-12-19', '2025-12-22', '2026-03-22', 'Asthma management approved'),
      (11, 11, 'PET/CT scan', '78815', 'C34.90', 'approved', 'AUTH-2025-011', '2025-12-21', '2025-12-24', '2026-03-24', 'Cancer staging approved'),
      (12, 12, 'Cystoscopy', '52000', 'N39.0', 'denied', NULL, '2025-12-23', '2025-12-27', NULL, 'Conservative treatment not attempted first'),
      (13, 13, 'Psychological testing', '96136', 'F41.1', 'pending', NULL, '2025-12-25', NULL, NULL, 'Awaiting clinical documentation'),
      (14, 14, 'Cataract surgery', '66984', 'H25.11', 'approved', 'AUTH-2025-014', '2025-12-27', '2025-12-30', '2026-03-30', 'Visually significant cataract confirmed'),
      (15, 15, 'Joint injection', '20610', 'M06.9', 'approved', 'AUTH-2025-015', '2025-12-29', '2026-01-02', '2026-04-02', 'RA flare management approved'),
      (16, 16, 'Laceration repair', '12001', 'S61.0', 'approved', 'AUTH-2025-016', '2026-01-01', '2026-01-01', '2026-04-01', 'Emergency procedure auto-approved')
    `);
    console.log('Prior authorizations seeded.');

    // Seed compliance records (15+)
    await pool.query(`
      INSERT INTO compliance_records (rule_name, category, description, status, last_audit_date, next_audit_date, findings, risk_level) VALUES
      ('HIPAA Privacy Rule', 'Privacy', 'Patient health information privacy safeguards', 'compliant', '2025-11-01', '2026-02-01', 'All PHI properly encrypted and access controlled', 'low'),
      ('HIPAA Security Rule', 'Security', 'Electronic PHI security measures', 'compliant', '2025-11-01', '2026-02-01', 'Security controls in place and tested', 'low'),
      ('Anti-Kickback Statute', 'Fraud Prevention', 'Prohibition of payment for referrals', 'compliant', '2025-10-15', '2026-01-15', 'No violations detected', 'low'),
      ('Stark Law', 'Fraud Prevention', 'Physician self-referral limitations', 'warning', '2025-10-15', '2026-01-15', 'One referral pattern needs review', 'medium'),
      ('False Claims Act', 'Billing', 'Prohibition of false claims to government programs', 'compliant', '2025-11-15', '2026-02-15', 'Billing accuracy at 99.2%', 'low'),
      ('CMS Conditions of Participation', 'Medicare', 'Medicare program participation requirements', 'compliant', '2025-09-01', '2025-12-01', 'All conditions met', 'low'),
      ('OSHA Compliance', 'Safety', 'Workplace safety and health standards', 'compliant', '2025-10-01', '2026-01-01', 'Safety training up to date', 'low'),
      ('ICD-10 Coding Accuracy', 'Coding', 'Diagnosis coding accuracy standards', 'warning', '2025-11-20', '2026-02-20', 'Coding error rate at 3.5%, target is below 3%', 'medium'),
      ('CPT Coding Compliance', 'Coding', 'Procedure coding compliance standards', 'non_compliant', '2025-11-20', '2026-02-20', 'Upcoding detected in 5 claims', 'high'),
      ('Timely Filing', 'Billing', 'Claims submission within payer deadlines', 'compliant', '2025-12-01', '2026-03-01', '98% of claims filed within deadline', 'low'),
      ('Patient Rights', 'Privacy', 'Patient access to records and consent', 'compliant', '2025-11-01', '2026-02-01', 'All consent forms properly maintained', 'low'),
      ('Emergency Medical Treatment (EMTALA)', 'Patient Care', 'Emergency treatment and screening obligations', 'compliant', '2025-10-01', '2026-01-01', 'All emergency patients properly screened', 'low'),
      ('Credentialing Standards', 'Provider', 'Provider credentialing and privileging', 'warning', '2025-09-15', '2025-12-15', '2 providers pending recredentialing', 'medium'),
      ('Billing Modifier Usage', 'Billing', 'Proper use of billing modifiers', 'compliant', '2025-11-15', '2026-02-15', 'Modifier usage within acceptable range', 'low'),
      ('Documentation Standards', 'Clinical', 'Clinical documentation requirements', 'non_compliant', '2025-12-01', '2026-03-01', 'Incomplete documentation in 8% of records', 'high'),
      ('Claim Scrubbing', 'Billing', 'Pre-submission claim validation', 'compliant', '2025-12-01', '2026-03-01', 'Automated scrubbing catching 95% of errors', 'low')
    `);
    console.log('Compliance records seeded.');

    // Seed payer contracts (15+)
    await pool.query(`
      INSERT INTO payer_contracts (payer_name, contract_number, start_date, end_date, fee_schedule_type, reimbursement_rate, terms, status) VALUES
      ('Blue Cross Blue Shield', 'BCBS-2025-001', '2025-01-01', '2025-12-31', 'Fee-for-Service', 85.00, 'Standard PPO contract with 85% of Medicare rates', 'active'),
      ('Aetna', 'AET-2025-001', '2025-01-01', '2025-12-31', 'Fee-for-Service', 82.00, 'HMO and PPO contract, 82% Medicare rates', 'active'),
      ('UnitedHealthcare', 'UHC-2025-001', '2025-01-01', '2025-12-31', 'Fee-for-Service', 88.00, 'Preferred provider rates, 88% Medicare', 'active'),
      ('Cigna', 'CIG-2025-001', '2025-04-01', '2026-03-31', 'Fee-for-Service', 80.00, 'Standard network contract', 'active'),
      ('Humana', 'HUM-2025-001', '2025-01-01', '2025-12-31', 'Capitated', 78.00, 'Capitated Medicare Advantage contract', 'active'),
      ('Medicare', 'CMS-2025-001', '2025-01-01', '2025-12-31', 'MPFS', 100.00, 'Medicare Physician Fee Schedule', 'active'),
      ('Medicaid IL', 'MDCD-IL-2025', '2025-07-01', '2026-06-30', 'Fee-for-Service', 65.00, 'Illinois Medicaid fee schedule', 'active'),
      ('Tricare', 'TRI-2025-001', '2025-01-01', '2025-12-31', 'Fee-for-Service', 90.00, 'Military health contract', 'active'),
      ('Blue Cross Blue Shield - Medicare Supp', 'BCBS-MS-2025', '2025-01-01', '2025-12-31', 'Fee-for-Service', 95.00, 'Medicare supplement plan', 'active'),
      ('Aetna Medicare Advantage', 'AET-MA-2025', '2025-01-01', '2025-12-31', 'Capitated', 75.00, 'Medicare Advantage capitated rates', 'active'),
      ('Workers Compensation IL', 'WC-IL-2025', '2025-01-01', '2025-12-31', 'Fee Schedule', 92.00, 'IL workers compensation fee schedule', 'active'),
      ('Auto Insurance - State Farm', 'SF-PIP-2025', '2025-01-01', '2025-12-31', 'Fee-for-Service', 100.00, 'PIP medical payments', 'active'),
      ('UnitedHealthcare Community Plan', 'UHC-CP-2025', '2025-01-01', '2025-12-31', 'Capitated', 70.00, 'Medicaid managed care', 'active'),
      ('Cigna Medicare Advantage', 'CIG-MA-2025', '2025-01-01', '2025-12-31', 'Capitated', 76.00, 'MA with Part D', 'active'),
      ('Humana Commercial', 'HUM-COM-2025', '2025-03-01', '2026-02-28', 'Fee-for-Service', 83.00, 'Commercial PPO rates', 'active'),
      ('Self-Pay Discount Program', 'SELF-2025', '2025-01-01', '2025-12-31', 'Discount', 50.00, '50% discount for self-pay patients', 'active')
    `);
    console.log('Payer contracts seeded.');

    // Seed aging reports (15+)
    await pool.query(`
      INSERT INTO aging_reports (patient_id, claim_id, amount, aging_bucket, days_outstanding, last_action, last_action_date) VALUES
      (1, 1, 30.00, '0-30', 15, 'Statement sent', '2025-12-20'),
      (3, 3, 280.00, '31-60', 45, 'Appeal submitted', '2025-12-20'),
      (5, 5, 220.00, '31-60', 38, 'Insurance follow-up', '2025-12-25'),
      (7, 7, 320.00, '61-90', 72, 'Second appeal submitted', '2025-12-28'),
      (9, 9, 150.00, '0-30', 22, 'Claim submitted', '2025-12-21'),
      (11, 11, 450.00, '61-90', 65, 'Denial received', '2025-12-28'),
      (13, 13, 250.00, '31-60', 40, 'Appeal in progress', '2025-12-29'),
      (15, 15, 310.00, '0-30', 10, 'Claim pending', '2026-01-02'),
      (1, 17, 180.00, '0-30', 8, 'Claim submitted', '2026-01-07'),
      (2, 2, 50.00, '91-120', 95, 'Final notice sent', '2025-12-10'),
      (4, 4, 20.00, '91-120', 100, 'Collections review', '2025-12-05'),
      (6, 6, 15.00, '120+', 130, 'Sent to collections', '2025-11-20'),
      (8, 8, 40.00, '61-90', 68, 'Payment plan offered', '2025-12-22'),
      (10, 10, 45.00, '31-60', 50, 'Insurance follow-up', '2025-12-20'),
      (12, 12, 25.00, '120+', 145, 'Write-off pending review', '2025-11-10'),
      (14, 14, 25.00, '0-30', 12, 'Statement generated', '2026-01-10')
    `);
    console.log('Aging reports seeded.');

    // Seed coding optimizations (15+)
    await pool.query(`
      INSERT INTO coding_optimizations (claim_id, original_cpt, suggested_cpt, original_icd, suggested_icd, potential_revenue_change, ai_confidence, recommendation, status) VALUES
      (1, '99213', '99214', 'J06.9', 'J06.9', 100.00, 85.50, 'Documentation supports higher E/M level based on complexity', 'pending'),
      (2, '99214', '99214', 'I10', 'I10', 0.00, 95.00, 'Coding is appropriate for the documented service', 'accepted'),
      (3, '99215', '99215', 'M54.5', 'M54.51', 0.00, 88.00, 'More specific ICD code available for lumbar radiculopathy', 'pending'),
      (5, '99214', '99215', 'E11.9', 'E11.65', 130.00, 78.00, 'Consider higher complexity code with specific diabetes complication', 'pending'),
      (6, '99212', '99213', 'J02.9', 'J02.9', 50.00, 72.00, 'Time-based coding may support higher level', 'rejected'),
      (7, '99215', '99215', 'G43.909', 'G43.901', 0.00, 90.00, 'More specific migraine code available - intractable', 'accepted'),
      (8, '99214', '99214', 'K21.0', 'K21.0', 0.00, 93.00, 'Coding appropriate', 'accepted'),
      (9, '99213', '99214', 'E11.65', 'E11.65', 75.00, 82.00, 'Diabetes management complexity may warrant higher E/M', 'pending'),
      (10, '99214', '99214', 'J45.20', 'J45.30', 0.00, 70.00, 'Consider persistent asthma code if documented', 'pending'),
      (11, '99215', '99215', 'C34.90', 'C34.91', 0.00, 88.00, 'More specific lung cancer laterality code', 'accepted'),
      (12, '99213', '99213', 'N39.0', 'N39.0', 0.00, 95.00, 'Coding appropriate for UTI visit', 'accepted'),
      (13, '99214', '99215', 'F41.1', 'F41.1', 100.00, 75.00, 'Extended session with crisis intervention supports higher level', 'pending'),
      (14, '99213', '99213', 'H52.1', 'H52.13', 0.00, 85.00, 'More specific myopia code for bilateral', 'accepted'),
      (15, '99215', '99215', 'M06.9', 'M06.09', 0.00, 80.00, 'Site-specific RA code available', 'pending'),
      (16, '99281', '99282', 'S61.0', 'S61.019A', 50.00, 68.00, 'ED complexity may support higher level', 'pending'),
      (17, '99214', '99214', 'J06.9', 'J06.9', 0.00, 92.00, 'Coding appropriate for follow-up visit', 'accepted')
    `);
    console.log('Coding optimizations seeded.');

    // Seed audit trail (15+)
    await pool.query(`
      INSERT INTO audit_trail (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, timestamp) VALUES
      (1, 'CREATE', 'claim', 1, NULL, '{"status":"submitted","billed_amount":150}', '192.168.1.100', '2025-12-05 09:00:00'),
      (1, 'UPDATE', 'claim', 1, '{"status":"submitted"}', '{"status":"approved"}', '192.168.1.100', '2025-12-15 10:30:00'),
      (2, 'CREATE', 'claim', 2, NULL, '{"status":"submitted","billed_amount":250}', '192.168.1.101', '2025-12-07 08:45:00'),
      (3, 'CREATE', 'payment', 1, NULL, '{"amount":120,"method":"insurance"}', '192.168.1.102', '2025-12-15 14:00:00'),
      (1, 'UPDATE', 'claim', 3, '{"status":"submitted"}', '{"status":"denied"}', '192.168.1.100', '2025-12-12 11:20:00'),
      (2, 'CREATE', 'prior_authorization', 1, NULL, '{"status":"pending","cpt_code":"72148"}', '192.168.1.101', '2025-12-01 13:00:00'),
      (1, 'UPDATE', 'prior_authorization', 1, '{"status":"pending"}', '{"status":"approved"}', '192.168.1.100', '2025-12-05 15:30:00'),
      (3, 'CREATE', 'denial', 1, NULL, '{"denial_code":"CO-197","claim_id":3}', '192.168.1.102', '2025-12-12 16:00:00'),
      (1, 'UPDATE', 'patient', 1, '{"balance_due":0}', '{"balance_due":250}', '192.168.1.100', '2025-12-20 09:15:00'),
      (2, 'CREATE', 'insurance_verification', 1, NULL, '{"status":"pending","patient_id":1}', '192.168.1.101', '2025-12-01 10:00:00'),
      (2, 'UPDATE', 'insurance_verification', 1, '{"status":"pending"}', '{"status":"verified"}', '192.168.1.101', '2025-12-01 14:30:00'),
      (3, 'CREATE', 'payment', 2, NULL, '{"amount":200,"method":"insurance"}', '192.168.1.102', '2025-12-17 11:00:00'),
      (1, 'UPDATE', 'compliance_record', 9, '{"status":"warning"}', '{"status":"non_compliant"}', '192.168.1.100', '2025-11-20 16:45:00'),
      (1, 'CREATE', 'ai_analysis', 1, NULL, '{"type":"denial_risk","entity":"claim"}', '192.168.1.100', '2025-12-20 12:00:00'),
      (2, 'UPDATE', 'claim', 13, '{"status":"denied"}', '{"status":"appealed"}', '192.168.1.101', '2025-12-29 14:20:00'),
      (3, 'VIEW', 'report', NULL, NULL, '{"report_type":"aging_summary"}', '192.168.1.102', '2026-01-02 08:30:00')
    `);
    console.log('Audit trail seeded.');

    // Seed AI analysis results (15+)
    await pool.query(`
      INSERT INTO ai_analysis_results (analysis_type, entity_id, entity_type, input_data, ai_response, model_used, confidence_score, recommendations) VALUES
      ('denial_risk', 1, 'claim', '{"cpt_code":"99213","icd_code":"J06.9","billed_amount":150}', '{"risk_level":"low","risk_score":15,"denial_probability":"12%"}', 'anthropic/claude-haiku-4.5', 85.00, '["Ensure documentation supports medical necessity","Verify insurance eligibility before submission"]'),
      ('denial_risk', 3, 'claim', '{"cpt_code":"99215","icd_code":"M54.5","billed_amount":350}', '{"risk_level":"high","risk_score":78,"denial_probability":"72%"}', 'anthropic/claude-haiku-4.5', 78.00, '["Obtain prior authorization before service","Include supporting radiology reports"]'),
      ('coding_optimization', 1, 'claim', '{"original_cpt":"99213","original_icd":"J06.9"}', '{"suggested_cpt":"99214","rationale":"Documentation supports moderate complexity"}', 'anthropic/claude-haiku-4.5', 85.50, '["Review documentation for additional complexity elements","Consider time-based coding"]'),
      ('denial_pattern', 0, 'denials', '{"total_denials":16,"date_range":"2025-12-01 to 2026-01-15"}', '{"top_patterns":["Prior auth issues","Medical necessity","Coding errors"]}', 'anthropic/claude-haiku-4.5', 0.00, '["Implement pre-submission authorization checks","Enhance clinical documentation","Conduct coder training"]'),
      ('appeal_suggestion', 1, 'denial', '{"denial_code":"CO-197","denial_reason":"Prior authorization required"}', '{"success_probability":"65%","strategy":"Submit retroactive authorization request"}', 'anthropic/claude-haiku-4.5', 65.00, '["Request retroactive auth","Include clinical notes","Reference emergency exception"]'),
      ('revenue_prediction', 0, 'claims', '{"total_claims":18,"date_range":"Dec 2025 - Jan 2026"}', '{"predicted_revenue":42500,"trend":"slightly increasing"}', 'anthropic/claude-haiku-4.5', 0.00, '["Focus on reducing denials","Improve clean claim rate","Negotiate higher contract rates"]'),
      ('compliance_check', 9, 'compliance_record', '{"rule_name":"CPT Coding Compliance","status":"non_compliant"}', '{"compliant":false,"risk_level":"high","issues":["Upcoding in 5 claims"]}', 'anthropic/claude-haiku-4.5', 0.00, '["Immediate coding audit","Retrain coding staff","Implement real-time coding validation"]'),
      ('contract_analysis', 1, 'payer_contract', '{"payer_name":"Blue Cross Blue Shield","reimbursement_rate":85}', '{"overall_rating":7,"market_comparison":"slightly below average"}', 'anthropic/claude-haiku-4.5', 0.00, '["Negotiate for 90% of Medicare rates","Request annual rate escalator","Add value-based incentives"]'),
      ('aging_prediction', 0, 'aging_reports', '{"total_records":16,"oldest_days":145}', '{"collection_probability":"62%","total_expected_recovery":1250}', 'anthropic/claude-haiku-4.5', 0.00, '["Prioritize 61-90 day accounts","Write off accounts over 120 days","Implement payment plans"]'),
      ('insurance_verification', 1, 'insurance_verification', '{"insurance_provider":"BCBS","policy_number":"POL-BCBS-001234"}', '{"verification_status":"active","coverage_assessment":"good coverage"}', 'anthropic/claude-haiku-4.5', 0.00, '["Verify deductible status at each visit","Confirm referral requirements","Check pre-authorization needs"]'),
      ('prior_auth_analysis', 3, 'prior_authorization', '{"cpt_code":"29881","icd_code":"M23.611","status":"pending"}', '{"approval_likelihood":"75%","estimated_timeline":"5-7 business days"}', 'anthropic/claude-haiku-4.5', 75.00, '["Submit MRI results with request","Include conservative treatment history","Document functional limitations"]'),
      ('denial_risk', 5, 'claim', '{"cpt_code":"99214","icd_code":"E11.9","billed_amount":250}', '{"risk_level":"medium","risk_score":45,"denial_probability":"38%"}', 'anthropic/claude-haiku-4.5', 55.00, '["Use more specific diabetes complication code","Document time spent on visit","Include lab results"]'),
      ('coding_optimization', 5, 'claim', '{"original_cpt":"99214","original_icd":"E11.9"}', '{"suggested_icd":"E11.65","rationale":"Specific complication code increases specificity"}', 'anthropic/claude-haiku-4.5', 78.00, '["Document specific diabetes complications","Use E11.65 for diabetic retinopathy","Consider adding HbA1c result code"]'),
      ('denial_risk', 7, 'claim', '{"cpt_code":"99215","icd_code":"G43.909","billed_amount":400}', '{"risk_level":"high","risk_score":82,"denial_probability":"76%"}', 'anthropic/claude-haiku-4.5', 82.00, '["Obtain prior authorization","Document severity of migraine episodes","Include specialist referral notes"]'),
      ('appeal_suggestion', 2, 'denial', '{"denial_code":"CO-50","denial_reason":"Medical necessity not established"}', '{"success_probability":"55%","strategy":"Submit peer-to-peer review request"}', 'anthropic/claude-haiku-4.5', 55.00, '["Request peer-to-peer review","Include treatment history","Submit objective clinical findings"]'),
      ('revenue_prediction', 0, 'claims', '{"analysis":"quarterly_forecast","quarter":"Q1_2026"}', '{"predicted_revenue":135000,"growth_rate":"3.2%"}', 'anthropic/claude-haiku-4.5', 0.00, '["Increase patient volume by 5%","Reduce denial rate to under 10%","Improve coding accuracy"]')
    `);
    console.log('AI analysis results seeded.');

    console.log('\nSeed completed successfully! All tables populated with data.');
  } catch (err) {
    console.error('Seeding error:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
