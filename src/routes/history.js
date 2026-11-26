import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.get('/', asyncHandler(async (request, response) => {
  const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0)
  });
  const { limit, offset } = querySchema.parse(request.query);

  const { rows } = await pool.query(
    `SELECT id, type, business_type, product, channel, tone, location, result, created_at
       FROM generations
      ORDER BY created_at DESC, id DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  response.json({ items: rows, limit, offset });
}));

export default router;
