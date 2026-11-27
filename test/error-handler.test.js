import assert from 'node:assert/strict';
import test from 'node:test';
import { RateLimitError } from 'openai';
import { errorHandler } from '../src/middleware/error-handler.js';

function createResponse() {
  return {
    headersSent: false,
    headers: {},
    statusCode: null,
    body: null,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function handleWithoutLogging(error) {
  const response = createResponse();
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    errorHandler(error, {}, response, () => {});
  } finally {
    console.error = originalConsoleError;
  }
  return response;
}

test('returns a retryable 503 for Gemini service errors', () => {
  const error = Object.assign(new Error('upstream unavailable'), {
    name: 'ApiError',
    status: 503
  });

  const response = handleWithoutLogging(error);

  assert.equal(response.statusCode, 503);
  assert.equal(response.headers['Retry-After'], '30');
  assert.match(response.body.error, /servicio de IA está temporalmente ocupado/);
});

test('returns a retryable 503 for Gemini request timeouts', () => {
  const error = Object.assign(new TypeError('fetch failed'), {
    cause: Object.assign(new Error('headers timeout'), {
      name: 'HeadersTimeoutError'
    })
  });

  const response = handleWithoutLogging(error);

  assert.equal(response.statusCode, 503);
  assert.equal(response.headers['Retry-After'], '30');
  assert.match(response.body.error, /servicio de IA está temporalmente ocupado/);
});

test('returns a retryable 503 for OpenAI rate limits', () => {
  const error = new RateLimitError(
    429,
    { message: 'rate limit exceeded' },
    'rate limit exceeded',
    new Headers()
  );

  const response = handleWithoutLogging(error);

  assert.equal(response.statusCode, 503);
  assert.equal(response.headers['Retry-After'], '30');
  assert.match(response.body.error, /servicio de IA está temporalmente ocupado/);
});
