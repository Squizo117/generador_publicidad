# Backend — Generador de publicidad

API REST con Express, Gemini y PostgreSQL. Requiere Node.js 20 o superior y una instancia PostgreSQL (incluido Supabase).

## Estructura

```text
client/
  src/App.tsx
  src/api.ts
  src/types.ts
  src/App.css
  src/index.css
  .env.example
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
4. Inicia el backend con `npm run dev` y, en otra terminal, el frontend con `npm run client:dev`. Abre `http://localhost:5173`; Vite envía `/api` al backend local.
5. Compila el frontend con `npm run client:build` (o `npm run build` desde la raíz).

La clave de Gemini se usa exclusivamente en el servidor. Para Supabase, descarga el certificado raíz en **Database Settings → SSL Configuration**, guárdalo como `certs/supabase-root.crt` y configura `DATABASE_SSL=true` y `DATABASE_SSL_CA_PATH=./certs/supabase-root.crt`. El servidor valida el certificado TLS; no desactives esa validación. Configura `FRONTEND_ORIGINS` con los dominios exactos autorizados.

## Publicación con GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` publica el frontend desde `client/` en cada cambio a `main`. En GitHub:

1. Abre **Settings → Pages** y selecciona **GitHub Actions** como fuente.
2. En **Settings → Secrets and variables → Actions → Variables**, crea `VITE_API_URL` con el origen público del backend, por ejemplo `https://tu-api.onrender.com`. No es una clave secreta.
3. La página estará en `https://squizo117.github.io/generador_publicidad/`.

GitHub Pages solo sirve archivos estáticos; no ejecuta Express. Publica el backend como **Web Service en Render**, usando la raíz del repositorio, `npm install` como build command y `npm start` como start command. Configura allí `GEMINI_API_KEY`, `GEMINI_MODEL`, `DATABASE_URL`, `DATABASE_SSL=true`, `DATABASE_SSL_CA_PATH` y `FRONTEND_ORIGINS`. Monta el certificado raíz de Supabase en Render y asigna su ruta a `DATABASE_SSL_CA_PATH`. Una vez publicado el API, fija `VITE_API_URL` a su origen y `FRONTEND_ORIGINS` a `https://squizo117.github.io` (sin la ruta del proyecto).

Nunca pongas `GEMINI_API_KEY` en GitHub Pages ni en variables `VITE_*`; solo debe existir en el entorno privado del backend.

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
