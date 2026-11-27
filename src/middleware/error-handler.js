import { ZodError } from 'zod';

export function notFoundHandler(request, response) {
  response.status(404).json({ error: 'Ruta no encontrada' });
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      error: 'Solicitud inválida',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  const isOpenAiUnavailable = [
    'APIConnectionError',
    'APIConnectionTimeoutError',
    'InternalServerError',
    'RateLimitError'
  ].includes(error.constructor?.name);
  const isRetryableApiStatus = Number.isInteger(error.status)
    && (error.status === 429 || error.status >= 500);
  const isAiUnavailable = (
    (error.name === 'ApiError' && error.status >= 500)
    || (isOpenAiUnavailable && (isRetryableApiStatus || error.status === undefined))
    || error.cause?.name === 'HeadersTimeoutError'
  );

  if (isAiUnavailable) {
    console.error('Error de API:', error);
    response.set('Retry-After', '30');
    return response.status(503).json({
      error: 'El servicio de IA está temporalmente ocupado. Intenta de nuevo en unos minutos.'
    });
  }

  console.error('Error de API:', error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
    ? error.status
    : 500;
  response.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : error.message
  });
}
