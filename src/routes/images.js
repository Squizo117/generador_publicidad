import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config/env.js';
import { generateImage } from '../services/openai-images.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

const imageGenerationSchema = z.object({
  businessType: z.string().trim().min(2).max(120),
  product: z.string().trim().min(2).max(500),
  style: z.enum(['fotografia', 'ilustracion', 'editorial']),
  size: z.enum(['cuadrado', 'horizontal', 'vertical'])
}).strict();

router.post('/', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Has alcanzado el límite temporal de imágenes. Intenta de nuevo más tarde.' }
}), asyncHandler(async (request, response) => {
  const input = imageGenerationSchema.parse(request.body);
  if (!config.OPENAI_API_KEY) {
    return response.status(503).json({
      error: 'Configura OPENAI_API_KEY en el servidor para generar imágenes.'
    });
  }

  const result = await generateImage(input);
  response.json(result);
}));

export default router;
