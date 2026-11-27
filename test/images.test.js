import assert from 'node:assert/strict';
import test from 'node:test';

process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.OPENAI_API_KEY = '';
process.env.DATABASE_SSL = 'false';

const { buildImagePrompt, generateImage } = await import('../src/services/openai-images.js');
const { app } = await import('../src/app.js');

test('builds a marketing prompt with the chosen product, style, and orientation', () => {
  const prompt = buildImagePrompt({
    businessType: 'cafetería',
    product: 'café frío con vainilla',
    style: 'fotografia',
    size: 'vertical'
  });

  assert.match(prompt, /cafetería/);
  assert.match(prompt, /café frío con vainilla/);
  assert.match(prompt, /formato vertical/);
  assert.match(prompt, /No incluyas texto/);
});

test('reports missing OpenAI configuration without making an API request', async () => {
  await assert.rejects(
    generateImage({
      businessType: 'cafetería',
      product: 'café frío',
      style: 'fotografia',
      size: 'cuadrado'
    }),
    {
      message: 'Configura OPENAI_API_KEY en el servidor para generar imágenes.',
      status: 503
    }
  );
});

test('returns a clear 503 from the image endpoint when OpenAI is not configured', async (context) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/images`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      businessType: 'cafetería',
      product: 'café frío',
      style: 'fotografia',
      size: 'cuadrado'
    })
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: 'Configura OPENAI_API_KEY en el servidor para generar imágenes.'
  });
});
