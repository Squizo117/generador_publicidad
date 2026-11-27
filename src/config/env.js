import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY es obligatoria'),
  GEMINI_MODEL_BASIC: z.string().min(1).default('gemini-3.5-flash-lite'),
  GEMINI_MODEL_ADVANCED: z.string().min(1).default('gemini-3.8-flash'),
  OPENAI_API_KEY: z.string().trim().optional(),
  OPENAI_IMAGE_MODEL: z.string().trim().min(1).default('gpt-image-2.5-flare'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),
  FRONTEND_ORIGINS: z.string().default('http://localhost:5173')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Configuración de entorno inválida: ${details}`);
}

export const config = {
  ...parsed.data,
  geminiModels: {
    basic: parsed.data.GEMINI_MODEL_BASIC,
    advanced: parsed.data.GEMINI_MODEL_ADVANCED
  },
  frontendOrigins: parsed.data.FRONTEND_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseSsl: parsed.data.DATABASE_SSL === 'true'
};
