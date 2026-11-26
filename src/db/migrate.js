import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const schemaPath = new URL('../../sql/001_initial_schema.sql', import.meta.url);

try {
  const schema = await readFile(fileURLToPath(schemaPath), 'utf8');
  await pool.query(schema);
  console.log('Esquema PostgreSQL aplicado correctamente.');
} catch (error) {
  console.error('No se pudo aplicar el esquema PostgreSQL:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
