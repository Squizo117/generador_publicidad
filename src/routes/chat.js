import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { replyToChat } from '../services/gemini.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

const chatSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(4_000)
}).strict();

router.post('/', asyncHandler(async (request, response) => {
  const input = chatSchema.parse(request.body);
  let sessionId = input.sessionId;

  if (sessionId) {
    const existing = await pool.query(
      'SELECT id FROM chat_sessions WHERE id = $1',
      [sessionId]
    );
    if (existing.rowCount === 0) {
      return response.status(404).json({ error: 'Sesión de chat no encontrada' });
    }
  } else {
    const created = await pool.query(
      'INSERT INTO chat_sessions DEFAULT VALUES RETURNING id'
    );
    sessionId = created.rows[0].id;
  }

  const history = await pool.query(
    `SELECT role, content
       FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 20`,
    [sessionId]
  );
  const messages = history.rows.reverse();
  const answer = await replyToChat(messages, input.message);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3), ($1, $4, $5)',
      [sessionId, 'user', input.message, 'assistant', answer]
    );
    await client.query(
      'UPDATE chat_sessions SET updated_at = now() WHERE id = $1',
      [sessionId]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  response.json({ sessionId, message: answer });
}));

router.get('/sessions/:sessionId/messages', asyncHandler(async (request, response) => {
  const parsedId = z.string().uuid().safeParse(request.params.sessionId);
  if (!parsedId.success) {
    return response.status(400).json({ error: 'sessionId debe ser un UUID válido' });
  }

  const session = await pool.query(
    'SELECT id FROM chat_sessions WHERE id = $1',
    [parsedId.data]
  );
  if (session.rowCount === 0) {
    return response.status(404).json({ error: 'Sesión de chat no encontrada' });
  }

  const { rows } = await pool.query(
    `SELECT id, role, content, created_at
       FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC, id ASC`,
    [parsedId.data]
  );
  response.json({ sessionId: parsedId.data, messages: rows });
}));

export default router;
