'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const bcrypt = require('bcryptjs');
const pool = require('../db');

const candidates = [
  ['PROVISION_ADMIN', 'Runtime Administrator', 'admin'],
  ['BOOTSTRAP_ADMIN', 'Bootstrap Administrator', 'admin'],
  ['SEED_ADMIN', 'Seed Administrator', 'admin'],
  ['SEED_USER', 'Demo Billing User', 'billing'],
  ['DEMO', 'Demo Administrator', 'admin'],
  ['ADMIN', 'Local Administrator', 'admin'],
  ['DEFAULT', 'Local Demo User', 'user'],
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local demo credential provisioning is disabled in production');
  }
  if (process.env.ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'false') {
    console.log('Local demo credential provisioning is disabled.');
    return;
  }

  const provisionedEmails = new Set();
  let provisionedCount = 0;
  for (const [prefix, name, role] of candidates) {
    const email = String(process.env[`${prefix}_EMAIL`] || '').trim().toLowerCase();
    const password = String(process.env[`${prefix}_PASSWORD`] || '');
    if (!email || !password || provisionedEmails.has(email)) continue;
    if (!email.includes('@') || password.length < 12 || password.length > 1024) {
      throw new Error(`${prefix} must provide a valid email and a 12-1024 character password`);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role`,
      [email, passwordHash, name, role]
    );
    provisionedEmails.add(email);
    provisionedCount += 1;
  }

  if (provisionedCount === 0) {
    throw new Error('No complete local demo credential pair is configured');
  }
  console.log(`Provisioned ${provisionedCount} local demo login account(s).`);
}

main()
  .catch((error) => {
    console.error(`Demo credential provisioning failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
