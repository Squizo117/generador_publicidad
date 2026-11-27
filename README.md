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
2. Copia `.env.example` a `.env` y define `GEMINI_API_KEY` y `DATABASE_URL`. `GEMINI_MODEL_BASIC` y `GEMINI_MODEL_ADVANCED` configuran los perfiles básico y potente.
3. Ejecuta `npm run db:migrate` para crear las tablas usando `DATABASE_URL`, o pega `sql/001_initial_schema.sql` en el SQL Editor de Supabase.
4. Inicia el backend con `npm run dev` y, en otra terminal, el frontend con `npm run client:dev`. Abre `http://localhost:5173`; Vite envía `/api` al backend local.
5. Compila el frontend con `npm run client:build` (o `npm run build` desde la raíz).

La clave de Gemini se usa exclusivamente en el servidor. Para Supabase, descarga el certificado raíz en **Database Settings → SSL Configuration**, guárdalo como `certs/supabase-root.crt` y configura `DATABASE_SSL=true` y `DATABASE_SSL_CA_PATH=./certs/supabase-root.crt`. El servidor valida el certificado TLS; no desactives esa validación. Configura `FRONTEND_ORIGINS` con los dominios exactos autorizados.

## Publicación con GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` publica el frontend desde `client/` en cada cambio a `main`. En GitHub:

1. Abre **Settings → Pages** y selecciona **GitHub Actions** como fuente.
2. En **Settings → Secrets and variables → Actions → Variables**, crea `VITE_API_URL` con el origen público del backend, por ejemplo `https://tu-api.onrender.com`. No es una clave secreta.
3. La página estará en `https://squizo117.github.io/generador_publicidad/`.

GitHub Pages solo sirve archivos estáticos; no ejecuta Express. El archivo `render.yaml` deja preparado el backend como **Web Service en Render**: selecciona **New → Blueprint**, conecta este repositorio y Render leerá el archivo. Completa los valores solicitados para `GEMINI_API_KEY` y `DATABASE_URL`.

Para `DATABASE_URL` en Render, usa la URI de Supabase **Session pooler** (IPv4, puerto 5432) copiada desde **Connect**. En el servicio de Render, añade en **Environment → Secret Files** un archivo llamado `supabase-root.crt` con el certificado raíz descargado de Supabase. El Blueprint ya apunta `DATABASE_SSL_CA_PATH` a `/etc/secrets/supabase-root.crt`.

Después del primer despliegue, copia el origen `https://...onrender.com` del API a la variable de repositorio `VITE_API_URL` en **Settings → Secrets and variables → Actions → Variables** y ejecuta el workflow `Deploy frontend to GitHub Pages` desde **Actions → Run workflow**. El Blueprint permite probar en el plan gratuito; Render puede suspender servicios gratuitos inactivos y tardar al despertar.

Nunca pongas `GEMINI_API_KEY` en GitHub Pages ni en variables `VITE_*`; solo debe existir en el entorno privado del backend.

El selector de modelo del frontend elige entre los perfiles de Gemini para chat y generación de texto. La pestaña **Vector** crea en el navegador composiciones SVG cuadradas, verticales u horizontales, con estilos y textos basados en los datos del formulario. No llama a una API de imágenes; los vectores son ilustraciones geométricas de muestra, no fotografías ni representaciones fotorrealistas del producto.

## Endpoints

- `GET /health` — estado del servidor.
- `POST /api/generate` — crea contenido y guarda el resultado.
- `GET /api/history?limit=20&offset=0` — historial paginado de generaciones.
- `POST /api/chat` — envía `{ "message": "...", "modelTier": "basic" }`; `modelTier` es opcional y acepta `basic` o `advanced`. Incluye `sessionId` para continuar una conversación.
- `GET /api/chat/sessions/:sessionId/messages` — obtiene el historial de mensajes de una sesión.

Ejemplo de generación:

```json
{
  "type": "facebook",
  "modelTier": "basic",
  "businessType": "cafetería",
  "product": "café frío y pan artesanal",
  "channel": "Facebook",
  "tone": "cercano",
  "location": "Puebla"
}
```

Prueba el estado con `curl http://localhost:3000/health`. Para probar el resto, envía solicitudes JSON a los endpoints descritos; las validaciones incorrectas responden HTTP 400 y los errores internos no filtran detalles al cliente.
