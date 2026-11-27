import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import chatRouter from './routes/chat.js';
import generateRouter from './routes/generate.js';
import historyRouter from './routes/history.js';

export const app = express();

if (config.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.frontendOrigins.includes(origin)) {
      return callback(null, true);
    }
    const error = new Error('Origen no permitido por CORS');
    error.status = 403;
    return callback(error);
  }
}));
app.use(express.json({ limit: '16kb' }));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' }
}));

app.get('/health', (request, response) => {
  response.json({ status: 'ok' });
});
app.use('/api/generate', generateRouter);
app.use('/api/chat', chatRouter);
app.use('/api/history', historyRouter);
app.use(notFoundHandler);
app.use(errorHandler);
