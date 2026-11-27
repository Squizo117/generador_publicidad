import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { generateVectorArtwork } from '../services/gemini.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

const vectorSchema = z.object({
  businessType: z.string().trim().min(2).max(120),
  product: z.string().trim().min(2).max(500),
  style: z.enum(['organico', 'minimalista', 'editorial']),
  size: z.enum(['cuadrado', 'horizontal', 'vertical'])
}).strict();

router.post('/', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Has alcanzado el límite temporal de diseños vectoriales. Intenta de nuevo más tarde.' }
}), asyncHandler(async (request, response) => {
  const input = vectorSchema.parse(request.body);
  const vector = await generateVectorArtwork(input);
  response.json(vector);
}));

export default router;
