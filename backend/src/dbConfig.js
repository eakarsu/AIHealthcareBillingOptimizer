const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_DB_NAME = 'healthcare_billing';

function getDatabaseUrl() {
  if (!process.env.DATABASE_URL) return null;

  try {
    return new URL(process.env.DATABASE_URL);
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
}

function getTargetDatabaseName() {
  if (process.env.DB_NAME) return process.env.DB_NAME;

  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) {
    const dbName = decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, ''));
    if (dbName) return dbName;
  }

  return DEFAULT_DB_NAME;
}

function getConnectionFields(database = getTargetDatabaseName()) {
  const databaseUrl = getDatabaseUrl();

  if (databaseUrl) {
    const config = {
      host: databaseUrl.hostname || process.env.DB_HOST || 'localhost',
      port: parseInt(databaseUrl.port || process.env.DB_PORT || '5432', 10),
      database,
      user: databaseUrl.username
        ? decodeURIComponent(databaseUrl.username)
        : process.env.DB_USER || process.env.USER || 'postgres',
    };

    if (databaseUrl.password) {
      config.password = decodeURIComponent(databaseUrl.password);
    } else if (process.env.DB_PASSWORD) {
      config.password = process.env.DB_PASSWORD;
    }

    return config;
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

function getAppPoolConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  return getConnectionFields();
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

module.exports = {
  getAppPoolConfig,
  getConnectionFields,
  getTargetDatabaseName,
  quoteIdentifier,
};
