import type { ChatMessage, GenerationInput, GenerationRecord, ModelTier } from './types'
import type { GeneratedVector, VectorInput } from './image-generator'

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

interface ApiError {
  error?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (init?.body) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body
      ? (body as ApiError).error
      : undefined
    throw new Error(message || `La solicitud falló (${response.status}).`)
  }

  return body as T
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  generate: (input: GenerationInput) =>
    request<{ generation: GenerationRecord }>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  generateVector: (input: VectorInput) =>
    request<GeneratedVector>('/api/images', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  history: () =>
    request<{ items: GenerationRecord[] }>('/api/history?limit=6&offset=0'),

  sendChat: (message: string, modelTier: ModelTier, sessionId?: string) =>
    request<{ sessionId: string; message: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, modelTier, ...(sessionId ? { sessionId } : {}) }),
    }),

  chatMessages: (sessionId: string) =>
    request<{ sessionId: string; messages: ChatMessage[] }>(
      `/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`,
    ),
}
