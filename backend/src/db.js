const { Pool } = require('pg');
const { getAppPoolConfig } = require('./dbConfig');

const pool = new Pool(getAppPoolConfig());

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
