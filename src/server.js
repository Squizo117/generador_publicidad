import { app } from './app.js';
import { config } from './config/env.js';
import { pool } from './db/pool.js';

try {
  await pool.query('SELECT 1');
  const server = app.listen(config.PORT, () => {
    console.log(`API lista en el puerto ${config.PORT}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    });
  }
} catch (error) {
  console.error('No se pudo iniciar el servidor. Verifica DATABASE_URL y la conexión a PostgreSQL:', error);
  await pool.end();
  process.exitCode = 1;
}
