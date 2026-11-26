import { z } from 'zod';

export const modelTierSchema = z.enum(['basic', 'advanced']).default('basic');
