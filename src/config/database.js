import 'dotenv/config';
import { z } from 'zod';

const databaseSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),
  DATABASE_SSL_CA_PATH: z.string().trim().min(1).optional()
});

const parsed = databaseSchema.superRefine((value, context) => {
  if (value.DATABASE_SSL === 'true' && !value.DATABASE_SSL_CA_PATH) {
    context.addIssue({
      code: 'custom',
      path: ['DATABASE_SSL_CA_PATH'],
      message: 'es obligatoria cuando DATABASE_SSL=true para validar el certificado de PostgreSQL'
    });
  }
}).safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Configuración de base de datos inválida: ${details}`);
}

export const databaseConfig = {
  connectionString: parsed.data.DATABASE_URL,
  ssl: parsed.data.DATABASE_SSL === 'true',
  sslCaPath: parsed.data.DATABASE_SSL_CA_PATH
};
