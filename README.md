# Backend — Generador de publicidad

API REST con Express, Gemini y PostgreSQL. Requiere Node.js 20 o superior y una instancia PostgreSQL (incluido Supabase).

## Estructura

```text
src/
  app.js
  server.js
  config/env.js
  db/pool.js
  middleware/error-handler.js
  routes/generate.js
  routes/chat.js
  routes/history.js
  services/gemini.js
  utils/async-handler.js
sql/001_initial_schema.sql
.env.example
```

## Configuración

1. Instala dependencias con `npm install`.
2. Copia `.env.example` a `.env` y define `GEMINI_API_KEY` y `DATABASE_URL`.
3. Ejecuta `npm run db:migrate` para crear las tablas usando `DATABASE_URL`, o pega `sql/001_initial_schema.sql` en el SQL Editor de Supabase.
4. Inicia en desarrollo con `npm run dev`; producción con `npm start`.

La clave de Gemini se usa exclusivamente en el servidor. `DATABASE_SSL=true` habilita TLS con validación del certificado; configura `FRONTEND_ORIGINS` con los dominios exactos autorizados.

## Endpoints

- `GET /health` — estado del servidor.
- `POST /api/generate` — crea contenido y guarda el resultado.
- `GET /api/history?limit=20&offset=0` — historial paginado de generaciones.
- `POST /api/chat` — envía un mensaje; manda `{ "message": "..." }` para iniciar sesión o incluye `sessionId` para continuar.
- `GET /api/chat/sessions/:sessionId/messages` — obtiene el historial de mensajes de una sesión.

Ejemplo de generación:

```json
{
  "type": "facebook",
  "businessType": "cafetería",
  "product": "café frío y pan artesanal",
  "channel": "Facebook",
  "tone": "cercano",
  "location": "Puebla"
}
```

Prueba el estado con `curl http://localhost:3000/health`. Para probar el resto, envía solicitudes JSON a los endpoints descritos; las validaciones incorrectas responden HTTP 400 y los errores internos no filtran detalles al cliente.
