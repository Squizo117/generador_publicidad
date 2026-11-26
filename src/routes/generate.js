import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { generateMarketingContent } from '../services/gemini.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

const generationSchema = z.object({
  type: z.enum(['anuncio', 'facebook', 'slogan', 'nombres']),
  businessType: z.string().trim().min(2).max(120),
  product: z.string().trim().min(2).max(500),
  channel: z.string().trim().max(100).optional(),
  tone: z.string().trim().max(80).optional(),
  location: z.string().trim().max(160).optional(),
  additionalDetails: z.string().trim().max(1_000).optional()
}).strict();

router.post('/', asyncHandler(async (request, response) => {
  const input = generationSchema.parse(request.body);
  const output = await generateMarketingContent(input);

  const { rows } = await pool.query(
    `INSERT INTO generations
       (type, business_type, product, channel, tone, location, additional_details, result)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, type, business_type, product, channel, tone, location, result, created_at`,
    [
      input.type,
      input.businessType,
      input.product,
      input.channel ?? null,
      input.tone ?? null,
      input.location ?? null,
      input.additionalDetails ?? null,
      output
    ]
  );

  response.status(201).json({ generation: rows[0] });
}));

export default router;
