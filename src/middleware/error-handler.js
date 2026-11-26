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

  console.error('Error de API:', error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
    ? error.status
    : 500;
  response.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : error.message
  });
}
