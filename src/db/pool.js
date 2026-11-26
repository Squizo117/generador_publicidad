import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { databaseConfig } from '../config/database.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: databaseConfig.connectionString,
  ssl: databaseConfig.ssl
    ? {
        ca: readFileSync(resolve(databaseConfig.sslCaPath), 'utf8'),
        rejectUnauthorized: true
      }
    : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

pool.on('error', (error) => {
  console.error('Error inesperado en una conexión inactiva de PostgreSQL:', error);
});
